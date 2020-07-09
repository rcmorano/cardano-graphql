/* eslint-disable quotes */

import fs from 'fs'
import { cleanTestData, createTransaction } from './transactionUtil'
import { execSync } from 'child_process'

describe('CLI', () => {
  it('submits a signed transaction to the network using CLI', () => {
    const fromAddr = fs.readFileSync('../../app/payment.addr').toString().trim()
    const toAddr = fs.readFileSync('../../app/payment2.addr').toString().trim()
    const settings = {
      timeLimit: 300, // I can't find out how to work this out but it seems if you set it to 30 it's too low
      fromAddr,
      toAddr,
      signingKeyFile: '/app/payment.skey'
    }
    cleanTestData()
    const { txSignedFile, client } = createTransaction(settings)
    client.submitTransactionSync(txSignedFile)
    // wait for some time to allow the tx to succeed
    execSync(`sleep 10`)
    // we check that the transaction has been successful by checking that the to address has it
    const fromUTXOs = client.getUTXO(fromAddr).map(data => data.TxHash)
    const toUTXOs = client.getUTXO(toAddr).map(data => data.TxHash)
    const index = toUTXOs.findIndex(v => v === fromUTXOs[0])
    const toUTXO = toUTXOs[index]
    expect(toUTXO).toBeDefined()
  })
})
