import fs from 'fs'
import path from 'path'

import gql from 'graphql-tag'
import { DocumentNode } from 'graphql'

export async function loadQueryNode (fileBasePath: string, name: string): Promise<DocumentNode> {
  return gql`${await fs.promises.readFile(path.join(fileBasePath, `${name}.graphql`))}`
}

export function getTip (): DocumentNode {
  return gql`
  query {
    node {
      hash
      number
      slotNo
    }
  }
  `
}

export function submitTransaction (): DocumentNode {
  return gql`
  mutation($tx: Upload!){
    submitTransaction(file: $tx){
      id
    }
  }
  `
}
