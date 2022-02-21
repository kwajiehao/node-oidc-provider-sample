import {
    ClientAuthMethod,
    FindAccount,
    PKCEMethods,
    ResponseType,
    SigningAlgorithmWithNone,
} from 'oidc-provider'

import { findAccount } from './account'
import { interactions } from './interactions'
import config from '../../config'

const oidcProviderConfig = {
    acceptQueryParamAccessTokens: false,
    allowOmittingSingleRegisteredRedirectUri: false,
    claims: {
        acr: null,
        auth_time: null,
        iss: null,
        openid: ['sub'],
        myinfo: ['myinfo.name'],
        sid: null
    },
    clients: [],
    clientDefaults: {
        grant_types: [
          'authorization_code',
        ],
        id_token_signed_response_alg: 'RS256' as SigningAlgorithmWithNone,
        response_types: [
          'code' as ResponseType,
        ],
        token_endpoint_auth_method: 'none' as ClientAuthMethod,
    },
    cookies: {
        long: { signed: true, maxAge: (1 * 24 * 60 * 60) * 1000 }, // 1 day in ms
        short: { signed: true },
        keys: ['some secret key', 'test'], // TODO: Generate a proper key
    },
    devInteractions: { enabled: true },
    features: {
        claimsParameter: { enabled: false },
        clientCredentials: { enabled: false },        
        devInteractions: { enabled: false },
        encryption: { enabled: false },
        introspection: { enabled: true }, 
        jwtIntrospection: { enabled: true },     
    },
    findAccount,
    interactions,
    jwks: {
        keys: [
            JSON.parse(config.get('keys').jwtPrivateKey),
            JSON.parse(config.get('keys').jwtPublicKey),
        ],
    },
    pkce: {
        methods: ['S256' as PKCEMethods],
        required: () => false,
    },
    responseTypes: [
        'code id_token' as ResponseType,
        'code' as ResponseType,
        'id_token' as ResponseType,
        'none' as ResponseType,
    ],
    scopes: ['openid', 'myinfo.name'],
    ttl: {
        AccessToken: 1 * 60 * 60, // 1 hour in seconds
        AuthorizationCode: 10 * 60, // 10 minutes in seconds
        IdToken: 1 * 60 * 60, // 1 hour in seconds
        DeviceCode: 10 * 60, // 10 minutes in seconds
        RefreshToken: 1 * 24 * 60 * 60, // 1 day in seconds
    },
}

export { oidcProviderConfig }