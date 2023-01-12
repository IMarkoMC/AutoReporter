import { readFileSync } from 'fs'
import { parse } from 'yaml'
import { AbuseIPDB } from './src/Helpers/AbuseIPDB'
import IPtables from './src/Parsers/IPtables'
import { Config } from './src/types'
import { Error, Info, renameAndExit, writeStack } from './src/Utils/logger'

const config = parse(readFileSync('./Settings.yml', 'utf-8')) as Config
saveMySelf()

Info('Starting')

const abuseIPDB = new AbuseIPDB(config.AbuseIPDB.Key, config.AbuseIPDB.Categories)

switch (config.UseParser.toLowerCase()) {
  case 'iptables': {
    IPtables(abuseIPDB)
    break
  }

  case 'pfsense': {
    Error('Not implemented yet.')
    break
  }

  default: {
    Error('Invalid parser')
    process.exit(0)
  }
}

function saveMySelf (): void {
  process.on('uncaughtException', (ex: Error) => {
    Error('uncaughtException: %s', ex)
    console.log(ex)
    writeStack(ex)
  })

  process.on('unhandledRejection', (ex: Error) => {
    Error('unhandledRejection: %s', ex)
    console.log(ex)
    writeStack(ex)
  })

  //* Rename the log when the app exits
  process.on('SIGINT', () => {
    renameAndExit()
  })

  process.on('SIGQUIT', () => {
    renameAndExit()
  })
}
