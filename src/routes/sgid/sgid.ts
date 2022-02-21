import { Request, Response, Router } from 'express'
import { ok } from 'neverthrow'

import { SgidService } from '../../authenticators'
import { SgidClientError, SgidErrorCode } from '../../errors'

export const SgidRouter = Router()

/**
 * This router handles the sgID callbacks and reshapes the request
 * so that the OIDC provider can handle it properly. The reason we need
 * to reshape this request is because the OIDC provider does not properly
 * set `interaction` cookies if the uid is not present as a request param
 */
SgidRouter.get('/callback', (req: Request, res: Response) => {
    const { code, state } = req.query

    // Commenting out to test onboarding flow
    // if (state) {
    //     const result = SgidService.parseState(state as string)
    //     if (result.isErr()) throw result.error

    //     const {
    //         govEmail,
    //         interactionUid,
    //         interactionIatHash,
    //     } = result.value
    //     res.redirect(`/interaction/${interactionUid}/completeAuthentication?code=${code}&interactionIatHash=${interactionIatHash}&govEmail=${govEmail}`)
    //     return
    // }
    res.redirect(`/callback?code=${code}&state=${state}`)

    // throw new SgidClientError(SgidErrorCode.InvalidStateError)
})
