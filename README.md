# AutoReporter

A simple NodeJS app that reads the iptables log in the /var/log/kern.log file and parses it to get the source IP and destination port.

If the destination port is in the AutoReport list, the app will send a abuse report imedialty to AbuseIPDB using the API

Sample iptables rules are in the Example-Rules.sh file. Read them carefully as you can block yourself out of your dedicated server or virtual machine if you dont add your IP to the trusted chain

To open ports you can create a new chanin "services" or just insert the rule in the 3rd position (iptables -I INPUT 3 -p TCP --dport 80 -j ACCEPT)

The last rule should be the loganddrop chain and your INPUT policy needs to be DROP.

If you have a dynamic IP make sure to either allow the port 22 from everywhere or get some cheap VPS and do a VPN so you don't lose access to your server.

## Requisites 
You need iptables, ipset and nodejs

You also need to get a API key from the Account -> API tab in AbuseIPDB and set it in the Settings.yml file
