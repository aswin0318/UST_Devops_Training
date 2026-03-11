import express, { json } from 'express'
import responseTime from 'response-time'
import compression from 'compression'
import cors from 'cors'
import helmet from 'helmet'

function httpServerFactory ({
  logger,
  httpLogger,
  config,
  routes,
}) {
  let httpConnection
  const server = express()
  
  // Parse allowed origins from environment variable
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:8080', 'http://localhost:3000']
  
  server.use(responseTime())
  server.use(json())
  
  // Wrap httpLogger with error handling
  server.use((req, res, next) => {
    try {
      httpLogger(req, res, next)
    } catch (err) {
      console.error('httpLogger error:', err.message)
      next(err)
    }
  })
  
  server.use(compression())
  
  // Configurable CORS for production
  server.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours
  }))
  
  // Enhanced security headers
  server.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: allowedOrigins
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  }))
  
  // HTTPS enforcement for production
  // TODO: Enable this after setting up SSL certificates with Let's Encrypt
  // if (process.env.NODE_ENV === 'production') {
  //   server.use((req, res, next) => {
  //     if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
  //       return res.redirect(301, `https://${req.get('host')}${req.url}`)
  //     }
  //     next()
  //   })
  // }
  
  server.use(routes)

  // Error handler middleware (must be last)
  // eslint-disable-next-line no-unused-vars
  server.use((err, req, res, next) => {
    console.error('Error handler caught:', err.message, err.stack)

    logger.error({
      message: 'Request error',
      error: err.message,
      stack: err.stack?.split('\n'),
    })

    // Check if response was already sent
    if (res.headersSent) {
      console.error('Headers already sent, cannot send error response')
      return
    }

    const statusCode = err.statusCode || err.status || 500
    const body = err.body || { error: err.message || 'Internal Server Error' }

    try {
      res.status(statusCode).json(body)
    } catch (sendErr) {
      console.error('Failed to send error response:', sendErr.message)
      res.status(500).end()
    }
  })

  const { port } = config.http.server

  function start () {
    httpConnection = server.listen(port, () => {
      logger.info({
        message: 'Http server started',
        port,
      })
    })
  }

  function stop () {
    httpConnection?.close(() => {
      logger.info({
        message: 'Http server stopped',
        port,
      })
    })
  }

  return {
    start,
    stop,
  }
}

export default httpServerFactory
