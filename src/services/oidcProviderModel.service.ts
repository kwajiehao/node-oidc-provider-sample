import {
    attributeExists,
    ConditionExpression,
    equals,
} from '@aws/dynamodb-expressions'
import bluebird from 'bluebird'
import { chunk } from 'lodash'
import { AdapterPayload } from 'oidc-provider'

import { logger } from './logger.service'
import { OidcProviderModel } from '../models'
import { DbService } from './dynamodb.service'
import { getSecondsSinceEpoch, secondsSinceEpoch } from '../utils/common'
import { logOidcProviderError } from '../utils/logOidcProviderError' 
import {
    GsiSearchArgs,
    isGrantIdGsi,
    isUidGsi,
    OidcGsi,
} from '../types/oidc/oidcProviderDynamoDb'

const BLUEBIRD_CONCURRENCY = 2
const DYNAMO_DB_BATCH_WRITE_LIMIT = 25

export enum ModelType {
    AuthCode = 'AuthorizationCode',
    Client = 'Client',
    Grant = 'Grant',
    Interaction = 'Interaction',
    Session = 'Session',
}

class OidcProviderModelService {
    async getModelByModelId(modelId: string): Promise<OidcProviderModel | null> {
        const modelToGet = new OidcProviderModel().create({ modelId })
        const model = await DbService.getSafe(modelToGet, {
            // Attributes to return when retrieving the model
            projection: ['payload', 'expiresAt'],
        })
        // logger.info({
        //     message: 'Successfully retrieved OIDC provider model',
        //     meta: {
        //         action: 'OidcProviderModelServiceGetModelByModelId',
        //         modelId,
        //         model,
        //     },
        // })
        return model
    }

    // Retrieves a model using one of the model's global secondary indices
    async getModelByGsi(gsiSearchArgs: GsiSearchArgs): Promise<OidcProviderModel | null> {
        let gsi: OidcGsi
        if (isGrantIdGsi(gsiSearchArgs)) {
            gsi = OidcGsi.OidcGrantIdIndex
        } else if (isUidGsi(gsiSearchArgs)) {
            gsi = OidcGsi.OidcUidIndex
        } else {
            gsi = OidcGsi.OidcUserCodeIndex
        }

        const results = await DbService.queryAsync(
            OidcProviderModel,
            gsiSearchArgs,
            {
              indexName: gsi,
              projection: ['payload', 'expiresAt'],
              limit: 1,
              filter: DbService.OIDC_MODEL_TTL_CONDITION,
            }
        )

        if (results.length === 0) {
            // logger.info({
            //     message: 'No OIDC provider models found',
            //     meta: {
            //         action: 'OidcProviderModelServiceGetModelByGsi',
            //         gsi,
            //         gsiSearchArgs,
            //     },
            // })
            return null
        }
        // logger.info({
        //     message: 'Found OIDC provider model',
        //     meta: {
        //         action: 'OidcProviderModelServiceGetModelByGsi',
        //         gsi,
        //         gsiSearchArgs,
        //         model: results[0],
        //     },
        // })
        return results[0]
    }

    async deleteModelByModelId(modelId: string): Promise<void> {
        const modelToDelete = new OidcProviderModel().create({ modelId })
        await DbService.delete(modelToDelete)
        // logger.info({
        //     message: 'Successfully deleted OIDC provider model',
        //     meta: {
        //         action: 'OidcProviderModelServiceDeleteModel',
        //         modelId,
        //     },
        // })
    }

    async consumeModelByModelId(modelId: string): Promise<OidcProviderModel | null> {
        // modelId must exist
        const consumeCondition: ConditionExpression = {
            ...attributeExists(),
            subject: 'modelId',
        }

        /** 
         * We need to monitor this as it's possible that mapper.update with onMissing: 'skip'
         * does not work as expected and does not skip nested keys. We might need to manually
         * create an UpdateExpression to update and add the "consumed" key to the "payload"
         * attribute
         * 
         * Relevant github issue: https://github.com/awslabs/dynamodb-data-mapper-js/issues/206
         */
        try {
            const modelToUpdate = new OidcProviderModel().create({
                modelId,
                payload: {
                    consumed: getSecondsSinceEpoch(),
                },
            })
            const modelResult = await DbService.update(modelToUpdate, {
              condition: consumeCondition,
              onMissing: 'skip', // Do not remove existing properties from item
            })
            return modelResult
        } catch (err) {
            throw err
        }
    }

    async deleteAllModelsWithGrantId(grantId: string) {
        /**
         * Note: the scan and query methods of the AWS DynamoDb data mapper return asynchronous 
         * iterators and automatically continue fetching new pages of results until you break out 
         * of the loop. Hence, there is no need to loop over the results
         * 
         * Source: https://aws.amazon.com/blogs/developer/introducing-the-amazon-dynamodb-datamapper-for-javascript-developer-preview/
         */
        const results = await DbService.queryAsync(
            OidcProviderModel,
            { grantId },
            {
                indexName: OidcGsi.OidcGrantIdIndex,
                projection: ['modelId'],
                // Note that no limit was specified for this query
                filter: DbService.TTL_CONDITION,
            }
        )
        await bluebird.map(
            chunk(results, DYNAMO_DB_BATCH_WRITE_LIMIT),
            async (models) => {
                const modelsToDelete = models.map(({ modelId }) => new OidcProviderModel().create({ modelId }))
                try {
                    await DbService.batchDelete(modelsToDelete)
                } catch (err) {
                    logger.error({
                        message: 'Failed to delete some OIDC provider models',
                        meta: {
                            action: 'OidcProviderModelServiceDeleteAllModelsWithGrantId',
                            modelsToDelete,
                        },
                    })
                }
            },
            { concurrency: BLUEBIRD_CONCURRENCY }
        )
        // logger.info({
        //     message: 'Completed deleting OIDC provider models by grant id',
        //     meta: {
        //         action: 'OidcProviderModelServiceDeleteAllModelsWithGrantId',
        //         results: results.map(({ modelId }) => modelId ),
        //     },
        // })
    }

    async upsertModel(
        modelId: string,
        modelType: ModelType,
        modelOpts: Record<string, string | number>,
        oidcProviderModelPayload: AdapterPayload
    ): Promise<OidcProviderModel> {
        const { uid, userCode, grantId } = oidcProviderModelPayload
        const oidcProviderModel = new OidcProviderModel().create({
            modelId,
            uid,
            userCode,
            grantId,
            payload: oidcProviderModelPayload,
            ...modelOpts,
        })

        const existingModel = await this.getModelByModelId(modelId)
        // logger.info({
        //     message: `Retrieved OIDC provider ${modelType} for upsert`,
        //     meta: {
        //         action: `OidcProviderModelServiceUpsert${modelType}`,
        //         modelId,
        //         existingModel,
        //     },
        // })

        // Create if does not already exist
        if (!existingModel) {
            try {
                const createdClientModel = await DbService.put(oidcProviderModel)
                // logger.info({
                //     message: `Successfully created OIDC provider ${modelType}`,
                //     meta: {
                //         action: `OidcProviderModelServiceCreate${modelType}`,
                //         modelId,
                //     },
                // })
                return createdClientModel
            } catch (err) {
                logOidcProviderError(
                    err,
                    {
                        message: `Error when creating OIDC provider ${modelType}`,
                        action: `OidcProviderModelServiceCreate${modelType}`,
                        metadata: { modelId }
                    }
                )
                throw err
            }

        // Otherwise, update the existing model
        } else {
            try {
                /**
                 * Create condition expression to update OIDC provider model by modelId
                 * ref: https://awslabs.github.io/dynamodb-data-mapper-js/packages/dynamodb-expressions/
                 */
                const equalsExpressionPredicate = equals(modelId)
                const findByModelIdExpression: ConditionExpression = {
                    ...equalsExpressionPredicate,
                    subject: 'modelId'
                }
                const updatedClientModel = await DbService.update(oidcProviderModel, {
                    condition: findByModelIdExpression,
                    onMissing: 'skip', // remove existing properties from item        
                })
                // logger.info({
                //     message: `Successfully updated OIDC provider ${modelType}`,
                //     meta: {
                //         action: `OidcProviderModelServiceUpdate${modelType}`,
                //         modelId,
                //     },
                // })
                return updatedClientModel
            } catch (err) {
                logOidcProviderError(
                    err,
                    {
                        message: `Error when updating OIDC provider ${modelType}`,
                        action: `OidcProviderModelServiceUpdate${modelType}`,
                        metadata: { modelId }
                    }
                )
                throw err
            }
        }
    }
}

const instance = new OidcProviderModelService()

export { instance as OidcProviderModelService }