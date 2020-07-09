import { exec, execSync } from 'child_process'

export type Address = String

export interface Settings {
  testnet: string
  cardanoCli: string
}

export type Tip = {
  blockNo: number,
  headerHash: String,
  slotNo: number
}

export type UTXO = {
  TxHash: String,
  TxIx: number,
  Lovelace: number
}

export class Client {
  testnet: string
  cardanoCli: string

  constructor (settings: Settings) {
    this.testnet = settings.testnet
    this.cardanoCli = settings.cardanoCli
  }

  getTipSync (): Tip {
    const stdout = execSync(`${this.cardanoCli} shelley query tip ${this.testnet}`).toString()
    return JSON.parse(stdout)
  }

  getTip (): Promise<Tip> {
    return new Promise((resolve, reject) => {
      exec(`${this.cardanoCli} shelley query tip ${this.testnet}`, (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else if (stderr.toString() !== '') {
          reject(new Error(stderr.toString()))
        } else {
          resolve(JSON.parse(stdout))
        }
      })
    })
  }

  /**
   * Currently this CLI command does not return anything, if we want to get the id we need to check the UTXO after some time
   * @param txBodyFile the path to the signed tx file
   */
  submitTransactionSync (txBodyFile: String): string {
    return execSync(`${this.cardanoCli} shelley transaction submit --tx-file ${txBodyFile} ${this.testnet}`).toString()
  }

  /**
   * Currently this CLI command does not return anything, if we want to get the id we need to check the UTXO after some time
   * @param txBodyFile the path to the signed tx file
   */
  submitTransaction (txBodyFile: String): Promise<String> {
    return new Promise((resolve, reject) => {
      exec(`${this.cardanoCli} shelley transaction submit --tx-file ${txBodyFile} ${this.testnet}`, (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else if (stderr.toString() !== '') {
          reject(new Error(stderr.toString()))
        } else {
          resolve(stdout)
        }
      })
    })
  }

  getUTXO (address: Address): Array<UTXO> {
    const stdout = execSync(`${this.cardanoCli} shelley query utxo --address ${address} --testnet-magic 42`).toString()
    const rowToUtxo = function (row: string) {
      const fields = row.trim().split(/\W+/)
      return {
        TxHash: fields[0],
        TxIx: Number.parseInt(fields[1]),
        Lovelace: Number.parseInt(fields[2])
      }
    }
    const utxos = stdout.trim().split('\n').slice(2).map(rowToUtxo)
    return utxos
  }
}
