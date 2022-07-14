const { readFileSync } = require("fs"),
    { parse } = require('yaml'),
    { Info, Debug, Warn, Error, setDebug } = require('./src/Utils/Logger'),
    AbuseIPDB = require("./src/Helpers/AbuseIPDB"),
    IPtables = require("./src/Parsers/IPtables");

class Main {
    constructor() {
        this.config = parse(readFileSync('./Settings.yml', 'utf8'));
        Info('Starting!');

        setDebug(this.config.Debug)

        //* Load the AbuseIPDB helpoer
        this.abuseIPDB = new AbuseIPDB(this.config.AbuseIPDB.Key, this.config.AbuseIPDB.Categories)

        this.__init__();
    }

    /** @private */
    __init__() {
        //* Start the IPTables parser
        IPtables.call(this);
    }
}

new Main();