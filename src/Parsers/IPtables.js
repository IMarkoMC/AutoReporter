
const tail = require('tail'),
    { exec } = require('child_process'),
    { existsSync, readFileSync, appendFileSync } = require('fs'),
    { Info, Debug, Warn } = require('../Utils/Logger');

let ipMap = new Map()

// * This module reads a default IPTables log from the kern.log file and parses it to get: Source IP, Protocol, Source port and Destination port
// * Normal IPTables log: <user defined string ex: |<PROTO> DROP|> IN=eth0 OUT= MAC=02:00:00:99:51:e2:00:ff:03:02:ff:fd:08:00 SRC=167.248.133.175 DST=51.77.199.191 LEN=44 TOS=0x00 PREC=0x00 TTL=36 ID=56927 PROTO=TCP SPT=23510 DPT=21002 WINDOW=1024 RES=0x00 SYN URGP=0 

function isBlacklisted(ipAddress) {
    //* If the blacklist file does not exist there's no way that the ip is blacklisted lmfao
    if (!existsSync(process.cwd() + '/Blacklist.txt')) {
        return false;
    }

    //* Check if the blacklist file includes the IP
    return readFileSync(process.cwd() + '/Blacklist.txt', 'utf-8').includes(ipAddress)
}
module.exports = function () {

    let file = new tail.Tail(this.config.LogFile);

    file.on('line', (ln) => {
        Debug(ln);
        //* If the line doesn't contain DROP ignore it
        if (!ln.includes('DROP')) {
            ln = null
            return
        }

        let args = ln.split(/\s+/);

        let proto = args.filter(a => a.includes('PROTO='))
        let src = args.filter(a => a.includes('SRC='))

        //* The find function returns a array. we'll take the first element and remove the PROTO= SRC= DPT= and SPT=

        proto = proto[0].replace('PROTO=', '')

        //* If we got a ping, ignore the event
        if (proto == 'ICMP') {

            proto = null
            src = null

            args = null
            ln = null
            return
        }

        src = src[0].replace('SRC=', '')

        //* If the IP is already blacklisted ignore it
        if (isBlacklisted(src)) {

            Debug('Got a connection from %s but the ip is already blacklisted', src)

            proto = null
            src = null

            args = null
            ln = null
            return
        }


        let dpt = args.filter(a => a.includes('DPT='))
        let spt = args.filter(a => a.includes('SPT='))

        spt = spt[0]?.replace('SPT=', '')
        dpt = dpt[0]?.replace('DPT=', '')

        //* Some logging
        Info(`${proto} DROP - Source: ${src} - DPORT: ${dpt} - SPORT: ${spt}`)


        //? Is the IP in the list?
        if (ipMap.has(src)) {

            ipMap.get(src).ports.push(dpt);
            Debug('The IP %s tried connecting to the ports: %s', src, ipMap.get(src).ports);

            //! If the ip tried connecting to more ports than the allowed ports in config report it
            if (ipMap.get(src).ports.length >= this.config.portKnockingThreshold) {

                Warn('The IP %s tried connecting to more ports than the allowed. Sending the report', src)

                this.abuseIPDB.sendReport(src, this.config.AbuseIPDB.Port_Knoking);

                addToIPSet(src);

                //! Delete the ip from the map.
                ipMap.delete(src)
            }

            dpt = null
            src = null
            spt = null
            proto = null

            args = null
            ln = null
            return
        }

        //* This is the first connection from the IP. 
        //* Check if the port that they tried reaching is in the Autoreport list and if the port is in that list send the report to AbuseIPDB and add them to the blacklist

        if (this.config.AutoReport.includes(parseInt(dpt))) {

            Warn('The IP %s tried connecting to a protected port (%s). Sending the report', src, dpt);

            this.abuseIPDB.sendReport(src, this.config.AbuseIPDB.Protected_port.replace('{source}', src).replace('{port}', dpt).replace('{proto}', proto));

            addToIPSet(src)

            dpt = null
            src = null
            spt = null
            proto = null

            args = null
            ln = null
            return
        }

        //* Not a protected port, add the IP to the list with a array for the ports that it tried connecting and and the first connection timestamp

        ipMap.set(src, { firstConnection: Date.now(), ports: [dpt] })

        dpt = null
        src = null
        spt = null
        proto = null

        args = null
        ln = null
    })

    setInterval(() => {
        ipMap.forEach((values, ipAddress) => {
            if (Date.now() - values.firstConnection >= this.config.clearConnections * 1e3) {
                Debug('Removing %s from the list', ipAddress);
                ipMap.delete(ipAddress)
            }
            ipAddress = null
            values = null
        })
    }, 5e3); //* Do this check every 5 seconds

    function addToIPSet(src) {
        //* Call the ipset command
        exec(`ipset add blacklist ${src}`, (err, stdout, stderr) => {

            if (err) {
                Warn('An error ocurred while adding the ip %s to the blacklist ipset. Error:', src, err)
                return
            }

            Info('The ip %s was added successfuly to the blacklist ipset', src)

            err = null
            stderr = null
            stdout = null
        });

        //* add the IP to the blacklist and append a \n at the end so if someone needs to read it later it's not a mess of ips
        appendFileSync(process.cwd() + '/Blacklist.txt', src + '\n')
    }
}