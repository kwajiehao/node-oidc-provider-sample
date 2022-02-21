import { Request, Response } from 'express'

import { provider } from '../oidc'

async function handleInteractions(req: Request, res: Response) {
    // We might also want to check here if someone is already logged in - if so, we can directly
    // redirect them to the client
    try {
        const interactionDetails = await provider.interactionDetails(req, res)
        const { uid, prompt, params } = interactionDetails

        const { client_id: clientId } = params
        const client = await provider.Client.find(clientId as string) // we need to assert this because the library types are undefined

        if (prompt.name === 'login') {
            res.render('login', {
                client,
                uid,
                details: prompt.details,
                params,
                title: 'Sign-in',
                flash: undefined,
            });
            return
        }

        return res.render('interaction', {
            client,
            uid,
            details: prompt.details,
            params,
            title: 'Authorize',
        });
    } catch (err) {
        console.log(err)
    }
    
    // res.json('Ok')
}

async function handleSgIdCallback(_req: Request, _res: Response) {
    console.log("UM HELPs")
    _res.json('ok')
}

export {
    handleInteractions,
    // handleSgIdCallback,
}