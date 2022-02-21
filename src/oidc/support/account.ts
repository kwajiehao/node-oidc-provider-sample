import { Account, FindAccount } from 'oidc-provider'

import { UserService } from '../../services/user.service'
import { User } from '../../models' 

export class OidcAccount implements Account {
  // To satisfy the oidc-provider library types, otherwise Typescript
  // complains "Index signature is missing in type"
  // See https://stackoverflow.com/a/31977540
  [key: string]: unknown

  // The accounts are identified by their gov email
  accountId: string
  sub: string
  ssoSessionId?: string
  name?: string

  constructor({
    govEmail,
    ssoSessionId,
    sub,
    userData
  }: User) {
    const { userData: { name } } = userData
    this.accountId = govEmail
    this.ssoSessionId = ssoSessionId
    this.sub = sub
    this.name = name
  }

  claims() {
    return {
      govEmail: this.accountId,
      sub: this.sub,
      name: this.name,
    }
  }
}

export const findAccount: FindAccount = async (_ctx, govEmail) => {
  const user = await UserService.retrieve(govEmail)
  return new OidcAccount(user);
}

/**
 * This function triggers the sgID authentication flow by redirecting to the sgID QR code
 * for login with the SingPass app
 */
export const redirectToSgId = async () => {

}