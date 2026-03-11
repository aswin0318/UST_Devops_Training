import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import path from 'path'

const dirname = path.dirname(new URL(import.meta.url).pathname)

const PROTO_PATH = path.join(dirname, './protos/appointment.proto')

const grpcServerFactory = ({ config }) => ({ core, logger }) => {
  const { grpc: grpcConfig } = config

  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  })

  const proto = grpc.loadPackageDefinition(packageDefinition)

  const server = new grpc.Server()

  server.addService(proto.AppointmentService.service, core)

  async function start () {
    return new Promise((resolve, reject) => {
      server.bindAsync(
        `0.0.0.0:${grpcConfig.port}`,
        grpc.ServerCredentials.createInsecure(),
        (error) => {
          if (error) {
            logger.error({
              message: 'Failed to bind gRPC server',
              error: error.message,
              port: grpcConfig.port,
            })
            reject(error)
            return
          }
          server.start()
          logger.info({
            message: 'gRPC server started',
            port: grpcConfig.port,
          })
          resolve()
        },
      )
    })
  }

  async function stop () {
    server.forceShutdown()

    logger.info({
      message: 'gRPC server stopped',
    })
  }

  return {
    start,
    stop,
  }
}

export default grpcServerFactory
