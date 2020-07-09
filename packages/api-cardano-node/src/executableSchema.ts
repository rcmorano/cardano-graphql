import fs from 'fs'
import path from 'path'
import { makeExecutableSchema } from 'graphql-tools'
import { Resolvers } from './graphql_types'
import { saveReadStream, throwIfInvalidContentType } from './uploads'
import { Tip, Settings, Client } from './cli'

export function buildSchema (settings: Settings) {
  const client = new Client(settings)
  return makeExecutableSchema({
    resolvers: {
      Mutation: {
        submitTransaction: async (_root, { file }, _context) => {
          const fullFile = await file
          const { createReadStream, mimetype } = fullFile
          throwIfInvalidContentType(mimetype)
          const txFile = await saveReadStream(createReadStream())
          return client.submitTransaction(txFile.path).then((stdout: String) => {
            return { id: stdout }
          })
        }
      },
      Query: {
        node: () => client.getTip().then((tip: Tip) => {
          return {
            hash: tip.headerHash.toString(),
            number: tip.blockNo,
            slotNo: tip.slotNo
          }
        })
      }
    } as Resolvers,
    typeDefs: fs.readFileSync(path.resolve(__dirname, '..', 'schema.graphql'), 'utf-8')
  })
}
