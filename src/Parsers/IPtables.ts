import { AbuseIPDB } from '../Helpers/AbuseIPDB'
import { Info, Warn } from '../Utils/logger'
import { appendFileSync, existsSync, readFileSync } from 'fs'

import { Tail } from 'tail'
import { parse } from 'yaml'
import { Config } from '../types'

const config = parse(readFileSync(process.cwd() + '/Settings.yml', 'utf-8')) as Config

function isBlacklisted (ip: string): boolean {
  if (!existsSync(process.cwd() + '/blacklist.txt')) {
    return false
  }

  const list = readFileSync(process.cwd() + '/blacklist.log', 'utf-8').split('\n')

  return list.includes(ip)
}

export default function (abuseIPDB: AbuseIPDB): void {
  const file = new Tail(config.LogFile)

  file.on('line', (ln) => {
    const args = ln.split(/\s+/)

    const proto = args.filter((arg: string) => arg.includes('PROTO='))[0].substring(7) as string

    if (proto !== 'TCP') {
      return
    }

    const src = args.filter((arg: string) => arg.includes('SRC='))[0].substring(5) as string

    if (isBlacklisted(src)) {
      return
    }

    const dpt = args.filter((arg: string) => arg.includes('DPT='))[0].substring(4) as string
    const spt = args.filter((arg: string) => arg.includes('SPT='))[0].substring(4) as string

    Info(`${proto} DROP - Source: ${src} - DPORT: ${dpt} - SPORT: ${spt}`)

    const port = parseInt(dpt)

    if (config.AutoReport.includes(port)) {
      Warn('The IP %s tried connecting to a protected port (%s). Sending the report', src, dpt)

      const message = config.AbuseIPDB.Protected_port.replace('{soruce}', src).replace('{port}', dpt).replace('{proto}', proto)

      abuseIPDB.sendReport(src, message)

      appendFileSync(process.cwd() + '/blacklist.txt', src + '\n')
    }
  })
}
