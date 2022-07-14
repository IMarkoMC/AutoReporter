const { Info, Debug } = require('../Utils/Logger'),
    { default: axios } = require('axios')

module.exports = class AbuseIPDB {
    constructor(apiKey, categories) {
        this.apiKey = apiKey
        this.categories = categories
    }

    sendReport(ipAddress, comment) {
        Debug('Sending report of %s with categories %s and comment %s', ipAddress, this.categories, comment)
        axios.request({
            method: 'POST',
            url: 'https://api.abuseipdb.com/api/v2/report',
            data: {
                ip: ipAddress,
                categories: this.categories.join(),
                comment: comment
            },
            headers: {
                Key: this.apiKey
            }
        }).then((res, err) => {
            if (err) {
                console.log(err);
                return
            }
            Info('AbuseIPDB response: %s', res.data)
        })
    }
}