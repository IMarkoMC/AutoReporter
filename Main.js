const { readFileSync } = require("fs"),
    { parse } = require('yaml'),
    { Info, Debug, Warn, Error, setDebug, renameAndExit, writeErr } = require('./src/Utils/Logger'),
    AbuseIPDB = require("./src/Helpers/AbuseIPDB"),
    IPtables = require("./src/Parsers/IPtables"),
    PFSense = require("./src/Parsers/PFSense");

class Main {
    constructor() {
        this.config = parse(readFileSync('./Settings.yml', 'utf8'));
        Info('Starting!');

        this.saveMySelf();

        setDebug(this.config.Debug)

        //* Load the AbuseIPDB helpoer
        this.abuseIPDB = new AbuseIPDB(this.config.AbuseIPDB.Key, this.config.AbuseIPDB.Categories)

        this.__init__();
    }

    /** @private */
    __init__() {

        switch (this.config.UseParser) {
            case 'PFsense':
                PFSense.call(this)
                break

            case 'IPTables':
                //* Start the IPTables parser
                IPtables.call(this);
                break

            default:
                Error('The parser %s does not exist!', this.config.UseParser)
                process.exit(0)
        }
    }

    saveMySelf() {
        process.on('uncaughtException', (ex) => {
            Error(`uncaughtException: %s`, ex)
            console.log(ex)
            writeErr(ex)
            ex = null
        })

        process.on('unhandledRejection', (ex) => {
            Error(`unhandledRejection: %s`, ex)
            console.log(ex)
            writeErr(ex)
            ex = null
        })

        //* Rename the log when the app exits
        process.on('SIGINT', () => {
            renameAndExit()
        })

        process.on('SIGQUIT', () => {
            renameAndExit()
        })
    }
}

new Main();
