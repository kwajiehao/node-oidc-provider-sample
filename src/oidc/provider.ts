import { Provider } from 'oidc-provider'

import config from '../config'
import { oidcProviderConfig } from './support/configuration'
import { DynamoDBAdapter } from './adapters/dynamodb.adapter'
import {
    authorizationErrorCallback,
    interactionStartedCallback,
    serverErrorCallback,
} from './listeners/helpers'

const ISSUER = config.get('oidc').issuer
const provider = new Provider(ISSUER, { adapter: DynamoDBAdapter, ...oidcProviderConfig })
provider.on('authorization.error', authorizationErrorCallback)
provider.on('interaction.started', interactionStartedCallback)
provider.on('server_error', serverErrorCallback)

export { provider }