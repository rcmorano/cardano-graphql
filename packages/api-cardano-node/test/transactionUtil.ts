/* eslint-disable quotes */

import { execSync } from 'child_process'
import { Tip, Client, Address, UTXO } from '@src/cli'

/**
 * A lot of things in this file are set up so that you can run the tests either in the graphql docker container or
 * locally by using docker exec. For example you can run `TEST_CMD_PREFIX='docker exec -t d429046f80f2' yarn test`
 */
const cmdPrefix = process.env.TEST_CMD_PREFIX
const cardanoCli = `${cmdPrefix} cardano-cli`
const rm = `${cmdPrefix} rm`
const cat = `${cmdPrefix} cat`
const testnet = `--testnet-magic ${process.env.CARDANO_MAGIC || '42'}`
const client = new Client({ testnet, cardanoCli })

interface ISlotRate {
  rate: number
}

type TxOut = {
  address: Address,
  change: number
}

function txOutString (txOut: TxOut): String {
  return txOut.address + '+' + txOut.change.toString()
}

function txInString (utxo: UTXO): String {
  return utxo.TxHash + '#' + utxo.TxIx.toString()
}

function createProtocolParams (outFile: string) {
  execSync(`${cardanoCli} shelley query protocol-parameters --testnet-magic 42  --out-file ${outFile}`).toString()
}

function calculateTTL (tip: Tip, slotRate: ISlotRate, limit: number): number {
  return tip.slotNo + (slotRate.rate * limit)
}

function calculateChange (from: UTXO, amount: number, fee: number): number {
  return from.Lovelace - amount - fee
}

function buildTransaction (utxoIn: UTXO, from: TxOut, to: TxOut, ttl: number, fee: number, txOutFile: String) {
  const txIn = txInString(utxoIn)
  const txOutFrom = txOutString(from)
  const txOutTo = txOutString(to)
  execSync(`${cardanoCli} shelley transaction build-raw --tx-in ${txIn} --tx-out ${txOutFrom} --tx-out ${txOutTo} --ttl ${ttl} --fee ${fee} --out-file ${txOutFile}`).toString()
}

function calculateFee (txBodyFile: String, protocolParamsFile: String): number {
  const stdout = execSync(`${cardanoCli} shelley transaction calculate-min-fee --tx-body-file ${txBodyFile} --tx-in-count 1 --tx-out-count 2 --testnet-magic 42 --protocol-params-file ${protocolParamsFile} --witness-count 0 --byron-witness-count 0`).toString()
  return Number.parseInt(stdout.replace('Lovelace', '').trim())
}

function signTransaction (txBodyFile: String, signingKeyFile: String, txOutFile: String) {
  execSync(`${cardanoCli} shelley transaction sign --tx-body-file ${txBodyFile} --signing-key-file ${signingKeyFile} --testnet-magic 42 --out-file ${txOutFile}`).toString()
}

type Settings = {
  timeLimit: number
  fromAddr: string
  toAddr: string
  signingKeyFile: string
}

export type TestData = {
  txSignedFile: string
  client: Client
}

/**
 * We want to get rid of any data from previous tests to avoid confusion
 */
export function cleanTestData () {
  execSync(`${rm} tx.signed || true`)
  execSync(`${rm} tx.raw || true`)
  execSync(`${rm} protocol.json || true`)
  execSync(`${rm} tx-no-fee || true`)
}

/**
 * Create a new, signed transaction that can be submitted
 * @param settings Test Settings
 */
export function createTransaction (settings: Settings): TestData {
  const paymentAmount = 10
  const protocolFile = 'protocol.json'
  createProtocolParams(protocolFile)
  const tip = client.getTipSync()
  const slotRate = { rate: 1 } // I don't currently know where to get this number from
  const ttl = calculateTTL(tip, slotRate, settings.timeLimit)
  const fromUtxo = client.getUTXO(settings.fromAddr)[0]
  const balanceWithoutFee = calculateChange(fromUtxo, paymentAmount, 0)
  const txOutFrom = { address: settings.fromAddr, change: balanceWithoutFee }
  const txOutTo = { address: settings.toAddr, change: paymentAmount }
  const txNoFeeFile = 'tx-no-fee.raw'
  buildTransaction(fromUtxo, txOutFrom, txOutTo, ttl, 0, txNoFeeFile)
  const fee = calculateFee(txNoFeeFile, protocolFile)
  const txWithFeeFile = 'tx.raw'
  const balanceWithFee = calculateChange(fromUtxo, paymentAmount, fee)
  const txOutFromWithFee = { address: settings.fromAddr, change: balanceWithFee }
  buildTransaction(fromUtxo, txOutFromWithFee, txOutTo, ttl, fee, txWithFeeFile)
  const txSignedFile = 'tx.signed'
  signTransaction(txWithFeeFile, settings.signingKeyFile, txSignedFile)
  return { txSignedFile, client }
}

export function getTransactionFileUpload (txFile: string): string {
  return execSync(`${cat} ${txFile}`).toString()
}
