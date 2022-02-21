import { Application, Request, Response, json, static as Static, urlencoded } from 'express'
import path from 'path'

import { provider } from '../oidc'
import { logger } from '../services/logger.service'
import { sendTestEmail, transporter } from '../services/mail.service'
import { errorHandler } from '../errors'
import { safeJsonParse } from '../utils/common'
import { allowOnlySecureRequests } from '../middleware'
import config from '../config'

import {
  InteractionsRouter,
  OnboardingRouter,
  SgidRouter,
} from '../routes/'

const expressLoader = (app: Application): void => {
  // Set middlewares
  app.use(urlencoded({ extended: false })) // Note: this is needed to receive POST requests from HTML forms
  app.use(json())
  if (config.get('env') !== 'development') app.use(allowOnlySecureRequests)

  // Set view engine
  app.set('view engine', 'ejs');
  app.set('views', path.resolve(__dirname, '../assets/views'));  

  // Healthcheck
  app.get('/', async (_req: Request, res: Response) => {
    await sendTestEmail('jiehao@open.gov.sg')
    logger.info({
      message: 'Sent test email',
      meta: { action: 'Send test email'}
    })
    res.sendStatus(200)
  })
    
  app.use('/sgid/', SgidRouter)
  app.use('/', InteractionsRouter)
  app.use('/', OnboardingRouter)

  app.use(provider.callback())

  app.use(errorHandler)
}

export { expressLoader }
