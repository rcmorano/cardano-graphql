import fs from 'fs'
import util from '@cardano-graphql/util'
import { TestClient } from '@cardano-graphql/util-dev'
import { cleanTestData, createTransaction, getTransactionFileUpload } from './transactionUtil'
import FormData from 'form-data'
import fetch from 'node-fetch'
import { DocumentNode } from 'graphql'
import path from 'path'
import { buildClient } from './util'
import delay from 'delay'

const fromAddr = fs.readFileSync('../../app/payment.addr').toString().trim()
const toAddr = fs.readFileSync('../../app/payment2.addr').toString().trim()

function loadQueryNode (name: string): Promise<DocumentNode> {
  return util.loadQueryNode(path.resolve(__dirname, '..', 'src', 'example_queries'), name)
}

describe('graphql', () => {
  let graphQlClient: TestClient

  beforeAll(async () => {
    graphQlClient = await buildClient()
  })

  it('submits a signed transaction to the network using graphql', async () => {
    const nodeTipResult = await graphQlClient.query({
      query: await loadQueryNode('nodeTip')
    })
    expect(nodeTipResult.data.node.hash).toBeDefined()
    const settings = {
      timeLimit: 300,
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
    await delay(10000)
    // we check that the transaction has been successful by checking that the to address has it
    const fromUTXOs = client.getUTXO(fromAddr).map(data => data.TxHash)
    const toUTXOs = client.getUTXO(toAddr).map(data => data.TxHash)
    const index = toUTXOs.findIndex(v => v === fromUTXOs[0])
    const toUTXO = toUTXOs[index]
    expect(toUTXO).toBeDefined()
  })
})
