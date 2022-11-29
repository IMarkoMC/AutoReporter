export interface Config {
  portKnockingThreshold: number
  clearConnections: number
  AutoReport: [number]
  LogFile: string

  AbuseIPDB: {
    Key: string
    Categories: [number]
    Port_Knoking: string
    Protected_port: string
  }

  UseParser: string

  PFSense: {
    WAN_INTERFACE: string
    Network: string
  }
}
