# AutoReporter

A simple NodeJS app that reads the iptables log in the /var/log/kern.log file and parses it to get the source IP and destination port.

If the destination port is in the AutoReport list, the app will send a abuse report imedialty to AbuseIPDB using the API

Sample iptables rules are in the Example-Rules.sh file. Read them carefully as you can block yourself out of your dedicated server or virtual machine if you dont add your IP to the trusted chain

To open ports you can create a new chain "services" or just insert the rule in the 3rd position (iptables -I INPUT 3 -p TCP --dport 80 -j ACCEPT)

The last rule should be the loganddrop chain and your INPUT policy needs to be DROP.

If you have a dynamic IP make sure to either allow the port 22 from everywhere or get some cheap VPS and do a VPN so you don't lose access to your server.

## Requisites 
You need iptables, ipset and nodejs

You also need to get a API key from the Account -> API tab in AbuseIPDB and set it in the Settings.yml file

## Setup
Clone the repo and install all dependencies ``npm i``

Once the dependencies are installed you need to create the ipset so the app can actualy block the connections

To create the ipset you need to execute: ``ipset create blacklist hash:ip``

Next you probably want to ensure that you're not locking yourself out of your vm/dedicated. To do that either allow the port 22 to everyone (not recommended) or you can create a new "trusted" chain to grant you access to all ports.

If you decide to just allow the port 22 to the world just execute ``iptables -I INPUT 1 -p tcp --dport 22 -J ACCEPT``. Note the -I so we're inserting the rule at the first position and not adding it to the list.

If you go with the trusted chain you'll need to do a few more things.

First. let's create the chain ``iptables -N trusted``

Then add your IP address to that chain ``iptables -A trusted -s <your ip> -j ACCEPT``

You might want to add some VPN server (or your host machine) to that list also in case you change your ip. The command is the same, just put the dedicated/VPN ip there.

Finally we need to add a RETURN to that chain ``iptables -A trusted -j RETURN``. **Make sure the return is the last element. Any rules after that will be ignored**

If you want to add another IP to the trusted chain you can do so using this command: ``iptables -I trusted 2 -s <IP> -j ACCEPT``

Finally we add the trusted chain to the INPUT chain ``iptables -I INPUT 1 -j trusted``. 

The trusted chain is first so you get access to all ports.

Next up is probably on your best interest to allow all incoming and outgoing traffic to the loopback interface.

The rule to accept all incoming traffic from the loopback interface is ``iptables -A INPUT  -i lo -j ACCEPT``

If you want to allow some port to be accessible for everyone you need to add it to the chain now ``iptables -A INPUT -p <TCP/UDP> --dport <PORT> -j ACCEPT``. 

You can also add it later, you need to make sure to INSERT it not ADD it after the drop rule: ``iptables -I INPUT 3 -p <TCP/UDP> --dport <PORT> -j ACCEPT``

To accept all outgoing traffic in the loopback interface you need to replace the chain from INPUT to OUTPUT and the "-i" argument to "-o". ``iptables -A OUTPUT -o lo -j ACCEPT``

Next we'll need a chain to accept all established connections so when we set the policy of the chain INPUT from ACCEPT to DROP you can still reach services

For that you need to execute all of this 

```
iptables -N chain-states
iptables -A chain-states -p tcp  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A chain-states -p udp  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A chain-states -p icmp -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A chain-states -j RETURN
 ```
 
Once you have the chain-states chain created and all the rules in it we can add it to the input chain ``iptables -A INPUT -j chain-states``

With that you're nearly there... A few things left

We need to add a rule to DROP all the traffic incomming from the blacklisted ips. For that we're going to use the set module ``iptables -A INPUT -m set --match-set blacklist src -j DROP``

If you want to log the dropped traffic: ``iptables -A INPUT -m set --match-set blacklist src -j LOG --log-prefix " [BLACKLISTED] "``. This rule **needs to be** before the DROP rule.

Check that everything is right (All the chains should be there. and your IP should be in the trusted chain), if everything is fine then you can execute the last command: ``iptables -P INPUT DROP``

You should start seeing rejected connections being logged in ``/var/log/kern.log``. Check if you can connect to the vps/dedicated server with a new SSH session and then you can start the NodeJS app


### Please don't do while true do node Main.js
![image](https://user-images.githubusercontent.com/44303652/184276032-ee8fec56-2714-41f1-934a-5ca246b5429d.png)

