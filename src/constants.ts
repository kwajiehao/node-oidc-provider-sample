/**
 * CRYPTO
 */
export const BASE64_ENC = 'base64'
export const UTF8_ENC = 'utf8'
export const SHA256_ALG = 'sha256'
export const MYINFO_JWE_ALG = 'aes-256-gcm'
export const SGID_FIELD_JWE_ALG = 'aes-128-gcm'
export const ID_TOKEN_JWT_ALG = 'RS256'

/**
 * REQUEST
 */
export const RESPONSE_TYPE = {
  AUTH_CODE: 'code',
}
export const GRANT_TYPE = {
  AUTH_CODE: 'authorization_code',
}
export const REQUEST_TYPE = {
  OAUTH: 'oauth',
  P2P: 'p2p',
} as const
export const ACCESS_TOKEN_TYPE = 'Bearer'