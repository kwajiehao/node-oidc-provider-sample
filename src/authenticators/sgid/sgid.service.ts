import { SgidClient } from '@opengovsg/sgid-client'
import { err, ok, Result, ResultAsync } from 'neverthrow'

import config from '../../config'
import { logger } from '../../services/logger.service'
import {
  ServerError,
  SgidErrorCode,
  SgidClientError,
} from '../../errors'
import { isSgidJwtPayload } from './sgid.utils'
import {
  SgidServiceClassArgs,
  SgidJwtPayload,
  SgidDataTypes,
} from './types'

const sgid = {
  clientId: config.get('sgid').clientId,
  clientSecret: config.get('sgid').clientSecret,
  // Note: sgid-client does not include the path prefix in the endpoint
  endpoint: `${config.get('sgid').authEndpoint}/v1/oauth`,
  redirectUri: config.get('sgid').redirectUri,
  scopes: config.get('sgid').scopes,
  // Note: we need to parse private/public keys differently because of the '\n' escape characters
  // See https://stackoverflow.com/questions/39492587/escaping-issue-with-firebase-privatekey-as-a-heroku-config-variable/41044630#41044630
  privateKey: config.get('sgid').privateKey.replace(/\\n/g, '\n'),
  publicKey: config.get('sgid').publicKey.replace(/\\n/g, '\n'),
  cookieDomain: '',
  cookieMaxAge: 3600000,
}

const stateDelimiter = ','

type SgidState = {
  govEmail?: string,
  interactionUid: string,
  interactionIatHash: string
}

export class SgidServiceClass {
  private client: SgidClient

  private publicKey: string
  private cookieDomain: string
  private cookieMaxAge: number
  private scopes: string

  constructor({
    cookieDomain,
    cookieMaxAge,
    publicKey,
    scopes,
    ...sgidOptions
  }: SgidServiceClassArgs) {
    this.client = new SgidClient({
      ...sgidOptions,
    })
    this.cookieDomain = cookieDomain
    this.cookieMaxAge = cookieMaxAge
    this.publicKey = publicKey
    this.scopes = scopes
  }

  /**
   * Create a URL to sgID which is used to redirect the user for authentication during onboarding
   * @param state - a random generated state value
   */
  createOnboardingRedirectUrl(state: string): Result<{ url: string }, SgidClientError> {
    const logMeta = {
      action: 'createOnboardingRedirectUrl',
      state,
    }
    const result = this.client.authorizationUrl(state, this.scopes)

    if (typeof result.url === 'string') {
      return ok({
        url: result.url,
      })
    } else {
      logger.error({
        message: 'Error while creating redirect URL during onboarding',
        meta: logMeta,
        error: result,
      })
      return err(new SgidClientError(SgidErrorCode.CreateRedirectUrlError)
      )
    }
  }

  /**
   * Create a URL to sgID which is used to redirect the user for authentication
   * @param state - the OAuth 2.0 state value. see the generateState method for how this is constructed
   */
  createRedirectUrl(state: string): Result<{ url: string, state: string }, SgidClientError> {
    const logMeta = {
      action: 'createRedirectUrl',
      state,
    }
    const result = this.client.authorizationUrl(state, this.scopes)

    if (typeof result.url === 'string') {
      return ok({
        url: result.url,
        state,
      })
    } else {
      logger.error({
        message: 'Error while creating redirect URL',
        meta: logMeta,
        error: result,
      })
      return err(new SgidClientError(SgidErrorCode.CreateRedirectUrlError)
      )
    }
  }

  /**
   * Generates a state value based on the provided options
   * 
   * @param opts.govEmail - a user's government email
   * @param opts.interactionUid - the interaction uid provided by OGPass. This string consists of only
   * @param opts.interactionCreatedAtHash - the hash of the timestamp at which the interaction was created
   * numbers and letters
   * @returns a state value that combines the options
   */
  generateState({
    govEmail,
    interactionUid,
    interactionIatHash,
  }: SgidState) {
    return `${interactionUid}${stateDelimiter}${interactionIatHash}${stateDelimiter}${govEmail}`
  }

  /**
   * Parses the state value returned by sgID
   * @param state - the OGPass interaction UID
   * @returns {Result<{ state: string; }, SgidClientError>}
   */
  parseState(state: string): Result<SgidState, SgidClientError> {
    const [interactionUid, interactionIatHash, govEmail] = state.split(',')
    const stateObj = {
      interactionUid,
      interactionIatHash,
      govEmail,
    }
    return stateObj
      ? ok(stateObj)
      : err(new SgidClientError(SgidErrorCode.InvalidStateError))
  }

  /**
   * Validates the state value returned by sgID
   * @param stateObj - the sgID state object
   * @returns 
   */
  validateState(_stateObj: SgidState) {
    // Validation logic
  }

  /**
   * To-be-refactored - to reconsider what the onboarding flow should be
   * Parses the string serialization containing the user's government email
   * @param state - a comma-separated string of the end user's government email and a random
   * number string
   * @returns {Result<{ govEmail: string; }, SgidClientError>}
   *   the user's government email
   */
  parseOnboardingState(_state: string): Result<string, SgidClientError> {
    //TODO: validate the received state
    return _state
      ? ok(_state)
      : err(new SgidClientError(SgidErrorCode.InvalidStateError)
      )
  }

  /**
   * Given the OIDC authorization code from sgID, obtain the corresponding
   * access token, which will be used later to retrieve user information
   * @param code - the authorization code
   */
  retrieveAccessToken(
    code: string,
  ): ResultAsync<
    { sub: string; accessToken: string },
    SgidClientError
  > {
    return ResultAsync.fromPromise(this.client.callback(code), (error) => {
      logger.error({
        message: 'Failed to retrieve access token from sgID',
        meta: {
          action: 'token',
          code,
        },
        error,
      })
      return new SgidClientError(SgidErrorCode.FetchAccessTokenError)
    })
  }

  /**
   * Given the OIDC access token from sgID, obtain the user's proxy id and name
   * @param accessToken - the access token
   */
  retrieveUserInfo({
    accessToken,
  }: {
    accessToken: string
  }): ResultAsync<
    {
      sub: string
      data: { [key in SgidDataTypes]: string }
    },
    SgidClientError
  > {
    return ResultAsync.fromPromise(
      this.client.userinfo(accessToken).then(({ sub, data }) => ({
        sub,
        data: { 'myinfo.name': data['myinfo.name'] },
      })),
      (error) => {
        logger.error({
          message: 'Failed to retrieve user info from sgID',
          meta: {
            action: 'userInfo',
            accessToken,
          },
          error,
        })
        return new SgidClientError(SgidErrorCode.FetchAccessTokenError)
      },
    )
  }

  /**
   * Create a JWT based on the userinfo from sgID
   * @param proxyId - the proxy id of the end user as obtained from sgID
   */
  createJwt(
    proxyId: string,
    govEmail: string,
  ): Result<{ jwt: string; maxAge: number }, ServerError> {
    const payload = { proxyId, govEmail }
    const maxAge = this.cookieMaxAge
    return ok({
      jwt: this.client.createJWT(payload, maxAge / 1000),
      maxAge,
    })
  }

  /**
   * Verifies a sgID JWT and extracts its payload.
   * @param jwtSgid The contents of the JWT cookie
   */
  extractSgidJwtPayload(
    jwtSgid: string,
  ): Result<
    SgidJwtPayload,
    SgidClientError
  > {
    const logMeta = {
      action: 'extractSgidJwtPayload',
    }
    try {
      if (!jwtSgid) {
        return err(new SgidClientError(SgidErrorCode.MissingJwtError))
      }

      const payload = this.client.verifyJWT(jwtSgid, this.publicKey)

      if (isSgidJwtPayload(payload)) {
        return ok(payload)
      }

      const payloadIsDefined = !!payload
      const payloadKeys =
        typeof payload === 'object' && !!payload && Object.keys(payload)
      logger.error({
        message: 'JWT has incorrect shape',
        meta: {
          ...logMeta,
          payloadIsDefined,
          payloadKeys,
        },
      })
      return err(new SgidClientError(SgidErrorCode.InvalidJwtError))
    } catch (error) {
      logger.error({
        message: 'Failed to verify JWT with auth client',
        meta: logMeta,
        error,
      })
      return err(new SgidClientError(SgidErrorCode.VerifyJwtErrorError))
    }
  }

  /**
   * Gets the cookie domain settings.
   */
  getCookieSettings():
    | { domain: string; path: string }
    | Record<string, never> {
    return this.cookieDomain ? { domain: this.cookieDomain, path: '/' } : {}
  }

  /**
   * Handles the response after authenticating with sgID
   */
  handleLoginResponse() {}
}

export const SgidService = new SgidServiceClass(sgid)
