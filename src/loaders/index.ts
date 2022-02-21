import { Application } from 'express'
import { Server } from 'http'
import { expressLoader } from './express.loader'

import config from '../config'

const initLoaders = async (app: Application): Promise<void> => {
  expressLoader(app)
}

export { initLoaders }
