import { NextFunction, Request, Response } from 'express'

export const setNoCache = (_req: Request, res: Response, next: NextFunction): void => {
    res.set('Pragma', 'no-cache')
    res.set('Cache-Control', 'no-cache, no-store')
    next()
}