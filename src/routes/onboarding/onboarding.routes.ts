import { Router } from 'express'

import { onboardingController } from '../../controllers' 
import { asyncErrorWrapper } from '../../errors'

export const OnboardingRouter = Router()

OnboardingRouter.get('/signup', onboardingController.renderSignup)
OnboardingRouter.post('/signup', asyncErrorWrapper(onboardingController.receiveSignup))
OnboardingRouter.get('/callback', asyncErrorWrapper(onboardingController.handleOnboardingLoginResponse))
