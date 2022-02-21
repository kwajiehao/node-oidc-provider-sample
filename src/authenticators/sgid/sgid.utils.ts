import { hasProp } from '../../utils/common'
import { SgidJwtPayload } from './types'

/**
 * Typeguard for SingPass JWT payload.
 * @param payload Payload decrypted from JWT
 */
export const isSgidJwtPayload = (
    payload: unknown,
): payload is SgidJwtPayload => {
    return (
      typeof payload === 'object' &&
      !!payload &&
      hasProp(payload, 'proxyId') &&
      typeof payload.proxyId === 'string' &&
      hasProp(payload, 'govEmail') &&
      typeof payload.govEmail === 'string'
    )
}
  