import { InteractionResults } from 'oidc-provider'

export type Interaction = {
    returnTo: string | undefined,
    prompt: {
        name: string,
        reasons: string[],
        details: object
    },
    lastSubmission?: InteractionResults | undefined,
    params: object, // Note: we are unable to use proper typing for `kind` because of the library types
    session?: object | undefined,
    kind: string, // Note: we are unable to use proper typing for `kind` because of the library types
    jti: string,
    exp: number,
    uid: string,
}