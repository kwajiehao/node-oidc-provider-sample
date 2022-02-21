import { User } from '../models'
import { PartialBy } from '../utils/types'

export type CreateUser = PartialBy<Pick<User, 'govEmail' | 'state'>, 'state'>

export type UpdateUser = Pick<User, 'govEmail' | 'ssoSessionId' | 'sub' | 'userData'>