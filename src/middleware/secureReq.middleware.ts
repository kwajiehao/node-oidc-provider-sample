import { NextFunction, Request, Response } from 'express'

import { InsecureConnectionError } from '../errors'

export const allowOnlySecureRequests = (req: Request, _res: Response, next: NextFunction): void => {
    if (req.secure) {
        next()
        return
    } else {
        throw new InsecureConnectionError('Request must use HTTPS!')
    }
}