export type SgidClientOptions = {
    clientId: string
    clientSecret: string
    endpoint: string
    privateKey: string
    publicKey: string
    redirectUri: string
    scopes: string
}

export type SgidServiceClassArgs = {
    cookieDomain: string
    cookieMaxAge: number
} & SgidClientOptions

export type SgidJwtPayload = {
    proxyId: string
    govEmail: string
}

export enum SgidDataTypes {
    MyinfoName = 'myinfo.name'
}