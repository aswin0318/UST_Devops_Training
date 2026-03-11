/* eslint-disable no-proto */
/* eslint-disable array-callback-return */
import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import path from 'path'
import { promisify } from 'util'

const dirname = path.dirname(new URL(import.meta.url).pathname)

export default function grpcClientFactory () {
  const protoConfig = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }

  return function loadService ({
    serviceName,
    fileName,
    address,
    credentials = grpc.credentials.createInsecure(),
  }) {
    const protoDef = protoLoader.loadSync(
      path.join(dirname, `./protos/${fileName}.proto`),
      protoConfig,
    )

    const proto = grpc.loadPackageDefinition(protoDef)

    const client = new proto[serviceName](address, credentials)

    // Set timeout for gRPC calls (5 seconds)
    client.waitForReady(Date.now() + 5000, (err) => {
      if (err) {
        console.error(`gRPC client not ready for ${serviceName} at ${address}:`, err.message)
      } else {
        console.log(`gRPC client ready for ${serviceName} at ${address}`)
      }
    })

    const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
    methodNames.forEach((prop) => {
      const value = client[prop]
      if (typeof value === 'function' && value.originalName !== undefined) {
        const originalMethod = value
        client[prop] = function(...args) {
          return new Promise((resolve, reject) => {
            try {
              const timeout = setTimeout(() => {
                reject(new Error(`gRPC call ${prop} timed out after 10 seconds`))
              }, 10000)

              originalMethod.call(client, ...args, (err, response) => {
                clearTimeout(timeout)
                if (err) {
                  console.error(`gRPC error in ${prop}:`, err.message)
                  reject(err)
                } else {
                  console.log(`gRPC ${prop} response received`)
                  resolve(response || {})
                }
              })
            } catch (e) {
              console.error(`Error calling gRPC ${prop}:`, e.message)
              reject(e)
            }
          })
        }
      }
    })

    return client
  }
}

