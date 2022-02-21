import {
  attribute,
  hashKey,
  table,
} from '@aws/dynamodb-data-mapper-annotations'
import { embed } from '@aws/dynamodb-data-mapper'
import { BaseModel } from './base.model'

export class UserData {
  @attribute()
  name: string
}
  
@table('user')
export class User extends BaseModel {
  @hashKey()
  govEmail: string

  /**
   * User's current session ID
   */
  @attribute()
  ssoSessionId?: string

  @attribute()
  sub: string

  @attribute()
  state: string

  // have to use map to preserve nested typings
  @attribute({
    defaultProvider: () => ({}),
    memberType: embed(UserData),
    attributeName: 'userData',
  })
  private _userData: Map<string, UserData>
  get userData(): { [key: string]: UserData } {
    return Object.fromEntries(this._userData.entries())
  }
  set userData(newVal: { [key: string]: UserData }) {
    this._userData = new Map(Object.entries(newVal))
  }

}
