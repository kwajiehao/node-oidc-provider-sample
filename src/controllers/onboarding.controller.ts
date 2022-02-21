import { Request, Response } from 'express'

import { SgidService } from '../authenticators'
import { NotFoundError } from '../errors'
import { sendSgidSignupEmail } from '../services/mail.service'
import { UserService } from '../services/user.service'
import { camelcaseShallow } from '../utils/common'

/**
 * Render end user signup page
 */
async function renderSignup(_req: Request, res: Response): Promise<void> {
    res.render('signup')
    return
}

/**
 * Receive end user's government email address and sends a follow-up email
 * containing a link to log into sgID
 */
async function receiveSignup(req: Request, res: Response): Promise<void> {
    //TODO: validation of HTML form submission
    console.log(req.query, req.params, req.body, "REQUEST")
    const { email } = camelcaseShallow(req.body)

    const state = Math.random().toString(36).slice(2)
    const result = SgidService.createOnboardingRedirectUrl(state)

    if (result.isErr()) throw result.error

    const { url: redirectUrl } = result.value

    // Associate the hash of the state value generated with the user, 
    // so that we can use that to retrieve the user when they complete the sgid flow
    //TODO: hash the state before storing it
    await UserService.create({
        govEmail: email,
        state,
    })

    sendSgidSignupEmail({
        recipient: email,
        sgidRedirectUrl: redirectUrl,
    })
    res.json('Please check your email. If you did not receive an email, please resubmit your email.')
}

/**
 * Handles the redirection response from the sgID server after user registers for the first time
 */
async function handleOnboardingLoginResponse(req: Request, res: Response): Promise<void> {
    const {
        code,
        state,
    } = camelcaseShallow(req.query as { [k: string]: string }) // force query params to be strings

    //TODO: invalidate state after it has been used once
    const parsedStateResult = SgidService.parseOnboardingState(state)
    if (parsedStateResult.isErr()) throw parsedStateResult.error
    const user = await UserService.retrieveByState(parsedStateResult.value)
    if (!user) throw new NotFoundError('Invalid state value') // User associated with that state value does not exist 
    console.log(user, "USER FOUND")

    // Retrieve access token
    const accessTokenResult = await SgidService.retrieveAccessToken(code as string)
    if (accessTokenResult.isErr()) throw accessTokenResult.error
    const { accessToken, sub } = accessTokenResult.value

    // Use access token to retrieve user info
    const userInfo = await SgidService.retrieveUserInfo({ accessToken: accessToken})
    if (userInfo.isErr()) throw userInfo.error
    console.log(userInfo, "USER INFO FOUND")

    //TODO: user validation to ensure that for a given sub, there is only one work email
    // Update user
    const userData = { userData: { name: userInfo.value.data['myinfo.name'] } }
    const updatedUser = await UserService.update({
        govEmail: user.govEmail,
        sub,
        userData,
    })

    //TODO: redirect user back to the client with an ID token. 
    // Note: This is not actually straightforward because we need to use the OIDC provider library to do this. 
    // We need to dig into the library again and see how we can couch the onboarding flow in terms of interactions,
    // and what the conditions are for returning the id token

    res.json('Ok')
}

export {
    renderSignup,
    receiveSignup,
    handleOnboardingLoginResponse,
}