import 'module-alias/register'
import express from 'express'
import http from 'http'

import config from './config'

import { initLoaders } from './loaders'
import { logger} from './services/logger.service'

const app = express()
const server = http.createServer(app)

const port = config.get('port')
const hostname = config.get('hostname')

;(async () => {
  await initLoaders(app)
  server.listen(port, () => {
    logger.info({
      message: 'Server started!',
      meta: {
        action: 'Start server',
        hostname,
        port,
      },
    })
  })
})()
