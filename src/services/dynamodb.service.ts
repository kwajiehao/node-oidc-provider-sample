import { DynamoDB } from 'aws-sdk'
import {
  DataMapper,
  StringToAnyObjectMap,
  GetOptions,
  QueryOptions,
} from '@aws/dynamodb-data-mapper'
import {
  ConditionExpression,
  ConditionExpressionPredicate,
} from '@aws/dynamodb-expressions'
import { ZeroArgumentsConstructor } from '@aws/dynamodb-data-marshaller'

import { ServerError } from '../errors'
import { secondsSinceEpoch } from '../utils/common'
import config from '../config'

const ITEM_NOT_FOUND_ERROR = 'ItemNotFoundException'
const DYNAMO_DB_ENDPOINT = config.get('aws').dbHost

interface CustomDataMapper extends DataMapper {
  getSafe: <T extends StringToAnyObjectMap>(
    itemToGet: T,
    options?: GetOptions
  ) => Promise<T | null>
  queryAsync: <T>(
    valueConstructor: ZeroArgumentsConstructor<T>,
    keyCondition:
      | ConditionExpression
      | {
          [propertyName: string]: ConditionExpressionPredicate | any
        },
    options?: QueryOptions
  ) => Promise<T[]>
  TTL_CONDITION: ConditionExpression
  OIDC_MODEL_TTL_CONDITION: ConditionExpression
}

const dynamoDbConfig: DynamoDB.ClientConfiguration = DYNAMO_DB_ENDPOINT
  ? {
      endpoint: DYNAMO_DB_ENDPOINT,
    }
  : {}

const dynamoDbClient = new DynamoDB(dynamoDbConfig)

const mapper = new DataMapper({
  client: dynamoDbClient,
  tableNamePrefix: `${config.get('aws').dbTablePrefix}ogpass-`, // optionally, you can provide a table prefix to keep your dev and prod tables separate
}) as CustomDataMapper

/**
 * Use this to get item as it checks for ttl and catches error if not found
 * @returns item or null
 */
mapper.getSafe = async <T extends StringToAnyObjectMap>(
  itemToGet: T,
  options?: GetOptions
): Promise<T | null> => {
  try {
    const item = await mapper.get(itemToGet, options)
    if (!item.ttl) {
      return item
    }
    // If ttl exists, check item has no expired
    return item.ttl > secondsSinceEpoch() ? item : null
  } catch (e: any) {
    if (e.name === ITEM_NOT_FOUND_ERROR) {
      return null
    }
    throw new ServerError(`Unable to connect to DB: ${e.message}`)
  }
}

mapper.queryAsync = async <T extends StringToAnyObjectMap>(
  valueConstructor: ZeroArgumentsConstructor<T>,
  keyCondition:
    | ConditionExpression
    | {
        [propertyName: string]: ConditionExpressionPredicate | any
      },
  options?: QueryOptions
): Promise<T[]> => {
  const results = []
  for await (const item of mapper.query(
    valueConstructor,
    keyCondition,
    options
  )) {
    results.push(item)
  }
  return results
}

mapper.TTL_CONDITION = {
  type: 'GreaterThan',
  subject: 'ttl',
  object: secondsSinceEpoch(),
}

mapper.OIDC_MODEL_TTL_CONDITION = {
  type: 'GreaterThan',
  subject: 'expiresAt',
  object: secondsSinceEpoch(),
}

export { mapper as DbService }
