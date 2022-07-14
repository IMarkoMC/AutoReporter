# If you DO NOT have ipset you need to install it

# Create the ipset "blacklist"
ipset create blacklist hash:ip

# Create a new "trusted" chain
iptables -N trusted

# Create the loganddrop chain
iptables -N loganddrop

# Create a chain for the established/related connections
iptables -N chain-states

# If you're using this in a OVH dedicated server uncomment this
# iptables -N ovh
# iptables -a ovh -p ICMP -s 37.187.231.251  -j ACCEPT
# iptables -a ovh -p ICMP -s 151.80.231.244  -j ACCEPT
# iptables -a ovh -p ICMP -s 151.80.231.245  -j ACCEPT
# iptables -a ovh -p ICMP -s 151.80.231.246  -j ACCEPT
# iptables -a ovh -p ICMP -s 151.80.231.247  -j ACCEPT
# iptables -a ovh -p ICMP -s 213.186.33.62   -j ACCEPT
# iptables -a ovh -p ICMP -s 92.222.184.0/24 -j ACCEPT
# iptables -a ovh -p ICMP -s 92.222.185.0/24 -j ACCEPT
# iptables -a ovh -p ICMP -s 92.222.186.0/24 -j ACCEPT
# iptables -a ovh -p ICMP -s 167.114.37.0/24 -j ACCEPT
# iptables -a ovh -p ICMP -s 139.99.1.144/28 -j ACCEPT
# iptables -a ovh -p ICMP -s 213.186.45.4    -j ACCEPT
# iptables -a ovh -p ICMP -s 213.251.184.9   -j ACCEPT
# iptables -a ovh -p ICMP -s 37.59.0.235     -j ACCEPT
# iptables -a ovh -p ICMP -s 8.33.137.2      -j ACCEPT
# iptables -a ovh -p ICMP -s 213.186.33.13   -j ACCEPT
# iptables -a ovh -p ICMP -s 213.186.50.98   -j ACCEPT

#OPTIONALS
# iptables -a ovh -p ICMP -s <Your server IP>.250   -j ACCEPT
# iptables -a ovh -p ICMP -s <Your server IP>.251  -j ACCEPT

# Allow all traffic from the trusted ips
iptables -I INPUT 1 -j trusted

# States
iptables -A chain-states -p tcp  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A chain-states -p udp  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A chain-states -p icmp -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A chain-states -j RETURN

# Accept everything on loopback
iptables -A INPUT  -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Accept incoming/outgoing packets for established connections
iptables -A INPUT  -j chain-states
iptables -A OUTPUT -j chain-states

# Add your IP to the trusted chain
iptables -A trusted -s <Your IP> -j ACCEPT
# Then add a RETURN to the trusted chain
iptables -A trusted -j RETURN


# Define the loganddrop rules
# Log everything and then DROP it
iptables -A loganddrop -p TCP -j LOG --log-prefix " [TCP DROP] "
iptables -A loganddrop -p UDP -j LOG --log-prefix " [UDP DROP] "
iptables -A loganddrop -p ICMP -j LOG --log-prefix " [ICMP DROP] "
iptables -A loganddrop -j DROP


# Finally add a rule to DROP all the traffic from the IPs in the blacklist ipset
# You can also log the blacklisted traffic

# iptables -A INPUT -m set --match-set blacklist src -j LOG --log-prefix " [BLACKLISTED] "
iptables -A INPUT -m set --match-set blacklist src -j DROP


# Verify that everything is right in the firewall configuration and then execute
# ** WARNING ** If you did NOT add your IP in the trusted chain executing this will block all your ssh connections

# iptables -A INPUT -j loganddrop
# iptables -P INPUT DROP