class HttpError extends Error {
  statusCode: number

  constructor(statusCode: number, message?: string) {
    super(message)
    this.statusCode = statusCode
  }
}
  
class AuthError extends HttpError {
  constructor(message: string) {
    super(401, message)
    this.name = 'AuthError'
  }
}

class ClientError extends HttpError {
  constructor(message: string) {
    super(400, message)
    this.name = 'ClientError'
  }
}

class InsecureConnectionError extends HttpError {
  constructor(message: string) {
    super(400, message)
    this.name = 'InsecureConnectionError'
  }
}

class ServerError extends HttpError {
  constructor(message: string) {
    super(500, message)
    this.name = 'ServerError'
  }
}

class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, message)
    this.name = 'NotFoundError'
  }
}

// ref authorization endpoint errors:
// Authorization /https://tools.ietf.org/html/rfc6749#section-4.2.1
enum OAuthAuthorizationErrorCode {
  InvalidRequest = 'invalid_request',
  UnauthorizedClient = 'unauthorized_client',
  RedirectUriMismatch = 'redirect_uri_mismatch', // This is an extension of Google OIDC
  InvalidScope = 'invalid_scope',
  UnsupportedResponseType = 'unsupported_response_type',
  UnauthorizedScope = 'authorized_scope', // custom
}
// Token Endpoint https://tools.ietf.org/html/rfc6749#section-5.2
enum OAuthTokenErrorCode {
  InvalidRequest = 'invalid_request',
  UnsupportedGrantType = 'unsupported_grant_type', // grant_type is not auth code
  InvalidGrant = 'invalid_grant', // auth code expired, invalid or redirect_uri does not match
  InvalidClient = 'invalid_client', // client auth failed
}

class OAuthClientError extends HttpError {
  oauthErrorCode: string

  constructor(
    oauthErrorCode: OAuthAuthorizationErrorCode | OAuthTokenErrorCode,
    message?: string
  ) {
    super(
      oauthErrorCode === OAuthTokenErrorCode.InvalidClient ? 401 : 400,
      message
    )
    this.oauthErrorCode = oauthErrorCode
    this.name = 'OAuthClientError'
  }
}

class BearerTokenError extends HttpError {
  constructor() {
    super(401, 'invalid_token')
    this.name = 'BearerTokenError'
  }
}

enum SgidErrorCode {
  CreateRedirectUrlError = 'create_redirect_url_error',
  InvalidStateError = 'invalid_state_error',
  FetchAccessTokenError = 'fetch_access_token_error',
  FetchUserInfoError = 'fetch_user_info_error',
  MissingJwtError = 'missing_jwt',
  InvalidJwtError = 'invalid_jwt',
  VerifyJwtErrorError = 'verify_jwt_error',
}

const sgidHttpErrorCode = {
  [SgidErrorCode.CreateRedirectUrlError]: 500,
  [SgidErrorCode.InvalidStateError]: 400,
  [SgidErrorCode.FetchAccessTokenError]: 500,
  [SgidErrorCode.FetchUserInfoError]: 500,
  [SgidErrorCode.MissingJwtError]: 400,
  [SgidErrorCode.InvalidJwtError]: 400,
  [SgidErrorCode.VerifyJwtErrorError]: 400,
}

const sgidErrorMessages = {
  [SgidErrorCode.CreateRedirectUrlError]: 'Error while creating redirect URL',
  [SgidErrorCode.InvalidStateError]: 'State given by sgID is malformed',
  [SgidErrorCode.FetchAccessTokenError]: 'Error while fetching access token',
  [SgidErrorCode.FetchUserInfoError]: 'Error while fetching user info',
  [SgidErrorCode.MissingJwtError]: 'No JWT present in cookies',
  [SgidErrorCode.InvalidJwtError]: 'Decoded JWT did not contain the correct attributes',
  [SgidErrorCode.VerifyJwtErrorError]: 'Attempts to verify JWT failed. JWT is likely to be invalid',
}

class SgidClientError extends HttpError {
  sgidErrorCode: string

  constructor(
    sgidErrorCode: SgidErrorCode,
  ) {
    super(sgidHttpErrorCode[sgidErrorCode], sgidErrorMessages[sgidErrorCode])
    this.sgidErrorCode = sgidErrorCode
    this.name = 'SgidErrorCode'
  }
}

export default {
  HttpError,
  AuthError,
  ClientError,
  ServerError,
  OAuthClientError,
  OAuthAuthorizationErrorCode,
  OAuthTokenErrorCode,
  NotFoundError,
  BearerTokenError,
}

export {
  HttpError,
  AuthError,
  ClientError,
  InsecureConnectionError,
  ServerError,
  OAuthClientError,
  OAuthAuthorizationErrorCode,
  OAuthTokenErrorCode,
  NotFoundError,
  BearerTokenError,
  SgidErrorCode,
  SgidClientError,
}
