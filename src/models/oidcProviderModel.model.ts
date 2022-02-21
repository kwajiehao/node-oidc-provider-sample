import {
    attribute,
    hashKey,
    table,
} from '@aws/dynamodb-data-mapper-annotations'
import { embed } from '@aws/dynamodb-data-mapper'
  
import { BaseModel } from './base.model'
import { secondsSinceEpoch } from '../utils/common'
import config from '../config'

const OIDC_PROVIDER_TTL_IN_SECONDS = config.get('ttl').oidcProvider

// This definition of the Payload class is erroneous - to-be-fixed later
class Payload {
    @attribute()
    payload: string
}

// This is a janky workaround to the typing issues
const doubleJsonParsePayload = (payload: { [key: string]: string }): Record<string, string> => {
    console.log(payload, "SOMETHING IS WRONG WITH THE PAYLOAD")
    return JSON.parse(JSON.parse(JSON.stringify(payload)))
}

@table('oidc-provider')
export class OidcProviderModel extends BaseModel {
    /**
     * A combination of the type of the provider model ("name") and a random id.
     * The modelId is constructed like so `${name}-${id}`.
     * 
     * The "name" is the type of the OIDC provider model. This is one of "Grant", "Session",
     * "AccessToken", "AuthorizationCode", "RefreshToken". See the DynamoDbAdapter
     * for more details.
     */
    @hashKey()
    modelId: string

    @attribute({
        defaultProvider: () => ({}),
        // To understand more about the available types, see the @aws/dynamodb-auto-marshaller library's
        // schema types. We should fix this later and provide a more specific type
        memberType: embed(Payload),
        attributeName: 'payload',
    })
    // The type of payload needs to match node-oidc-provider's AdapterPayload type
    private _payload: { [key: string]: string } | string
    get payload(): { [key: string]: string } {
        /**
         * !To-do: fix this janky workaround
         * 
         * The problem here is that when I insert the payload into DynamoDb via the CLI, it is stored as
         * a string. However, because the node-oidc-provider library requires the getter function for the
         * payload to return an object of type { [key: string]: string }, I need to define the private
         * _payload member as { [key: string]: string }
         * 
         * This leads to a type mismatch: Typescript thinks that the payload is of type { [key: string]: string }
         * when in fact it's a string. Therefore, instead of calling JSON.parse(payload) directly (which won't work,
         * because Typescript detects that payload is not of type string), I call strip the type from the payload
         * by parsing it as JSON.parse(JSON.stringify(payload)), and then running JSON.parse on the output of that
         * 
         * One avenue for investigation is to check whether we can store the payload not as a string, but as an object
         */
        if (typeof this._payload !== 'string') return doubleJsonParsePayload(this._payload)
        return JSON.parse(this._payload)
    }
    set payload(newVal: { [key: string]: string }) {
        /**
         * !To-do: fix this janky workaround
         * 
         * Likewise, I would like to store the payload as a string, to be consistent with the way we're currently
         * storing the payload via the CLI. However, this doesn't work, because the private _payload is of type
         * { [key: string]: string }. To get around this, I change its type to { [key: string]: string } | string.
         * 
         * However, this means I also need to introduce a workaround in the getter method, to type discriminate
         * against string values
         */
        this._payload = JSON.stringify(newVal)
    }

    @attribute()
    uid: string

    @attribute()
    grantId: string

    @attribute()
    userCode: string

    @attribute({
        defaultProvider: () => secondsSinceEpoch() + OIDC_PROVIDER_TTL_IN_SECONDS,
    }) // 5 mins by default
    expiresAt: number
  
    @attribute({ defaultProvider: () => new Date() })
    updatedAt: Date
  
    @attribute({ defaultProvider: () => new Date() })
    createdAt: Date
}
