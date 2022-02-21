import assert from 'assert'
import { Request, Response } from 'express'

import { asyncErrorWrapper } from '../errors'
import { provider } from '../oidc'
import { SgidService } from '../authenticators'
import { UserService } from '../services/user.service'
import { generateHashFromString } from '../utils/crypto'

async function handleLoginRequest(req: Request, res: Response)  {
    try {
        const interactionDetails = await provider.interactionDetails(req, res)
        const { iat, uid, prompt, params } = interactionDetails
        
        const generatedState = SgidService.generateState({
            interactionUid: uid,
            interactionIatHash: generateHashFromString(`${iat}`),
        })
        const result = SgidService.createRedirectUrl(generatedState)

        if (result.isErr()) throw result.error

        const {
            url: redirectUrl,
            state, //TODO: we need to store the sgID state and compare it later when we handle the sgID login response 
        } = result.value

        res.redirect(redirectUrl)
    } catch (err) {
        console.log(err)
    }
}

// Complete sgID authentication
async function handleSgIdCallback(req: Request, res: Response) {
    const { code, interactionIatHash, govEmail } = req.query

    //TODO: verify that hashed iat matches with the actual iat of the interaction as part of OAuth state verification
    const interactionDetails = await provider.interactionDetails(req, res)
    console.log(interactionDetails, "validate state")

    const accessTokenResult = await SgidService.retrieveAccessToken(code as string)

    if (accessTokenResult.isErr()) throw accessTokenResult.error

    const { accessToken, sub } = accessTokenResult.value

    //TODO: we can use the accessToken to retrieve user info like myinfo.name. Not an immediate priority

    let oidcResult: Record<string, object> | Record<string, string>= {}

    //TODO: based on sub, retrieve the user's work email. We might want to switch sub to nric in the future
    // Note: end user's work email is associated with their sub during the onboarding phase
    const user = await UserService.retrieveBySub(sub)
    if (user) {
        oidcResult = {
            login: { accountId: user.govEmail }, // the top-level key, "login", must match the OIDC prompt
        }
    } else {
        oidcResult = {
            error: 'access_denied',
            error_description: 'No user found',
        }
    }

    // The interactionFinished method will redirect the request back to the interactions route to fulfill
    // the consent prompt
    await provider.interactionFinished(req, res, oidcResult, { mergeWithLastSubmission: false })

    //TODO: log end of interaction
}

async function completeLogin(req: Request, res: Response) {
    const interactionDetails = await provider.interactionDetails(req, res)

    const { prompt: { name, details }, params, session } = interactionDetails
    assert.strictEqual(name, 'consent')

    let { grantId } = interactionDetails
    let grant

    // Note: checking logic is copied from the node-oidc-provider example
    if (grantId) {
        // we'll be modifying existing grant in existing session
        grant = await provider.Grant.find(grantId);
    } else {
        // we're establishing a new grant
        grant = new provider.Grant({
            accountId: session!.accountId,
            clientId: params.client_id as string,
        });
    }

    if (grant) {
        if (details.missingOIDCScope) {
            grant.addOIDCScope((details.missingOIDCScope as string[]).join(' '))
            // use grant.rejectOIDCScope to reject a subset or the whole thing
        }
        if (details.missingOIDCClaims) {
            grant.addOIDCClaims(details.missingOIDCClaims as string[])
            // use grant.rejectOIDCClaims to reject a subset or the whole thing
        }
        if (details.missingResourceScopes) {
            // eslint-disable-next-line no-restricted-syntax
            for (const [indicator, scopes] of Object.entries(details.missingResourceScopes as Record<string, string[]>)) {
            grant.addResourceScope(indicator, scopes.join(' '))
            // use grant.rejectResourceScope to reject a subset or the whole thing
            }
        }
    
        grantId = await grant.save();
    
        const consent = { grantId: '' }
        if (!interactionDetails.grantId) {
            // we don't have to pass grantId to consent, we're just modifying existing one
            consent.grantId = grantId
        }
    
        const result = { consent }
        await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true })    
    }

}


export {
    handleLoginRequest,
    handleSgIdCallback,
    completeLogin,
}