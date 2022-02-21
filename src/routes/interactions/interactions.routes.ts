import { Router } from 'express'

import { asyncErrorWrapper } from '../../errors'
import { provider } from '../../oidc'
import { setNoCache } from '../../middleware'
import {
    interactionsController,
    loginController,
    onboardingController,
} from '../../controllers'

export const InteractionsRouter = Router()

InteractionsRouter.get('/interaction/:uid', setNoCache, asyncErrorWrapper(interactionsController.handleInteractions))
InteractionsRouter.post('/interaction/:uid/login', setNoCache, asyncErrorWrapper(loginController.handleLoginRequest))
InteractionsRouter.get('/interaction/:uid/completeAuthentication', setNoCache, asyncErrorWrapper(loginController.handleSgIdCallback))
InteractionsRouter.post('/interaction/:uid/confirm', setNoCache, asyncErrorWrapper(loginController.completeLogin))

