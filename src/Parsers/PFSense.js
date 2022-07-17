
const tail = require('tail'),
    { exec } = require('child_process'),
    { existsSync, readFileSync, appendFileSync } = require('fs'),
    { networkInterfaces } = require('os'),
    { Info, Debug, Warn } = require('../Utils/Logger');

let ipMap = new Map()

// * This module reads a default PFsense filter log from the filter.log file and parses it to get: Source IP, Protocol, Source port and Destination port
// * Normal PFsense log: Jul 17 13:15:26 pfSense filterlog[28495]: 4,,,1000000103,bge0,match,block,in,4,0x0,,47,42822,0,DF,1,icmp,36,124.95.146.204,200.55.115.64,request,55372,3780016

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
        //* If the line doesn't contain match,block ignore it
        if (!ln.includes('match,block')) {
            ln = null
            return
        }

        let args = ln.split(',');

        let iface = args[4];

        if (!iface == this.config.PFSense.WAN_INTERFACE) {
            console.log('The interface is not the wan interface. Ignored.')
        }

        let src = args[18]

        if (inSubNet(src, this.config.PFSense.Network)) {
            Debug('The ip %s is in the net. ignoring log');

            return
        }

        if (isBlacklisted(src)) {

            Debug('Got a connection from %s but the ip is already blacklisted', src)

            iface = null
            src = null

            args = null
            ln = null
            return
        }

        let proto = args[16]

        let dport = args[21];

        Debug('IFACE: %s. PROTO %s. SRC: %s DPORT: %s', iface, proto, src, dport)


        if (proto != 'tcp' && proto != 'udp') {

            proto = null
            src = null
            dport = null

            return
        }

        if (this.config.AutoReport.includes(parseInt(dport))) {

            Warn('The IP %s tried connecting to a protected port (%s). Sending the report', src, dport);

            this.abuseIPDB.sendReport(src, this.config.AbuseIPDB.Protected_port.replace('{source}', src).replace('{port}', dport).replace('{proto}', proto.toUpperCase()));

            appendFileSync(process.cwd() + '/blacklist.txt', src + '\n')


            dport = null
            src = null
            proto = null

            args = null
            ln = null
            return
        }


        if (ipMap.has(src)) {

            ipMap.get(src).ports.push(dport);
            Debug('The IP %s tried connecting to the ports: %s', src, ipMap.get(src).ports);

            //! If the ip tried connecting to more ports than the allowed ports in config report it
            if (ipMap.get(src).ports.length >= this.config.portKnockingThreshold) {

                Warn('The IP %s tried connecting to more ports than the allowed. Sending the report', src)

                appendFileSync(process.cwd() + '/blacklist.txt', src + '\n')

                this.abuseIPDB.sendReport(src, this.config.AbuseIPDB.Protected_port.replace('{source}', src).replace('{port}', dport).replace('{proto}', proto));

                ipMap.delete(src)
            }


            dport = null
            src = null
            spt = null
            proto = null

            args = null
            ln = null
            return
        }


        ipMap.set(src, { firstConnection: Date.now(), ports: [dport] })
        dport = null
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

}


//Misc
var ip2long = function (ip) {
    var components;

    if (components = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)) {
        var iplong = 0;
        var power = 1;
        for (var i = 4; i >= 1; i -= 1) {
            iplong += power * parseInt(components[i]);
            power *= 256;
        }
        return iplong;
    }
    else return -1;
};

var inSubNet = function (ip, subnet) {
    var mask, base_ip, long_ip = ip2long(ip);
    if ((mask = subnet.match(/^(.*?)\/(\d{1,2})$/)) && ((base_ip = ip2long(mask[1])) >= 0)) {
        var freedom = Math.pow(2, 32 - parseInt(mask[2]));
        return (long_ip > base_ip) && (long_ip < base_ip + freedom - 1);
    }
    else return false;
};