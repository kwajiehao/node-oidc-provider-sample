import { Request, Response, NextFunction, RequestHandler } from 'express'
import { HttpError, OAuthClientError, SgidClientError } from './classes'
import { logger, LogMeta } from '../services/logger.service'
import config from '../config'

// Error handler middleware for express
// Needs all 4 parameters to be called, do not remove _next
function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const logMeta: LogMeta = {
    action: 'Express error handler',
  }
  if (config.get('env') !== 'development') logMeta.request = _req
  logger.error({
    message: err.message,
    meta: {
      ...logMeta,
      err,
    }
  })
  switch (err.name) {
    case 'ClientError':
    case 'AuthError':
    case 'NotFoundError':
      res.status(err.statusCode).json({ error: err.message })
      return
    case 'OAuthClientError': {
      const oauthError = err as OAuthClientError
      res.status(err.statusCode).json({
        error: oauthError.oauthErrorCode,
        error_description: oauthError.message,
      })
      return
    }
    case 'BearerTokenError': {
      res.setHeader('WWW-Authenticate', `error="${err.message}"`)
      res.sendStatus(401)
      return
    }
    case 'SgidErrorCode': {
      const sgidError = err as SgidClientError
      res.status(err.statusCode).json({
        error: sgidError.sgidErrorCode,
        error_description: sgidError.message,
      })
      return
    }
    case 'ServerError':
    default:
      res
        .status(500)
        .json({ error: `It's not you. It's us. We are having some problems.` })
  }
}

// Try catch wrapper for async route handlers
function asyncErrorWrapper(routeHandler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    routeHandler(req, res, next).catch((e: Error) => {
      next(e)
    })
  }
}

export { errorHandler, asyncErrorWrapper }
