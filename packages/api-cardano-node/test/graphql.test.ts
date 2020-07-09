/* eslint-disable quotes */

import fs from 'fs'
import util from '@cardano-graphql/util'
import utilDev from '@cardano-graphql/util-dev'
import { cleanTestData, createTransaction, getTransactionFileUpload } from './transactionUtil'
import FormData from 'form-data'
import fetch from 'node-fetch'
import { execSync } from 'child_process'

describe('graphql', () => {
  it('submits a signed transaction to the network using graphql', async () => {
    const graphqlClient = await utilDev.createE2EClient()
    const tip = await graphqlClient.query({
      query: util.getTip()
    })
    expect(tip.data.node.hash).toBeDefined()
    // FIXME: local files
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
    const fileContents = getTransactionFileUpload(txSignedFile)
    const body = new FormData()
    body.append(
      'operations',
      JSON.stringify({
        variables: {
          file: null
        },
        query: `mutation($tx: Upload!){
          submitTransaction(file: $tx){
            id
          }
        }`
      })
    )
    body.append('map', JSON.stringify({ 0: ['variables.tx'] }))
    body.append('0', fileContents, { filename: 'tx', contentType: 'application/cbor' })

    // Upload the file
    const result = await fetch('http://localhost:3100/', {
      method: 'POST',
      body: body
    })
    expect(result.status).toEqual(200)
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
