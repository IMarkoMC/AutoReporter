import axios, { AxiosError, AxiosResponse } from 'axios'
import { Debug, Info, Warn } from '../Utils/logger'

export class AbuseIPDB {
  apiKey: string
  categories: [number]

  constructor (apiKey: string, categories: [number]) {
    this.apiKey = apiKey
    this.categories = categories
  }

  sendReport (ipAddress: string, comment: string): void {
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
    }).then((res: AxiosResponse) => {
      Info('AbuseIPDB response: %s', res.data)
    }).catch((ex: AxiosError) => {
      Warn('An error occurred while reporting the ip %s. Error %s', ipAddress, ex)
    })
  }
}
