import { Adapter, AdapterPayload } from 'oidc-provider'

import { logger } from '../../services/logger.service'
import config from '../../config'
import { ModelType, OidcProviderModelService } from '../../services/oidcProviderModel.service'
import { OidcProviderModel } from '@models'

const validateModel = (modelResult: OidcProviderModel | null) => {
    // DynamoDB can take upto 48 hours to drop expired items, so a check is required
    if (!modelResult || (modelResult.expiresAt && Date.now() > modelResult.expiresAt * 1000)) {
        return undefined;
    }

    return modelResult.payload
}

/**
 * Based on the examples provided in the node-oidc-provider repo
 * See `example/my_adapter.js` and `lib/adapters/memory_adapter.js`
 */
export class DynamoDBAdapter implements Adapter {
    name: string

    /**
     * 
     * @param name For our purposes, name must be one of "Grant", "Session",
     * "AccessToken", "AuthorizationCode", "Interaction", "RefreshToken". For the full list of
     * values supported by oidc-provider, refer to the example adapter in the library
     * repo
     */
    constructor(name: string) {
        this.name = name
    }

    /**
     *
     * Update or Create an instance of an oidc-provider model.
     *
     * @return {Promise} Promise fulfilled when the operation succeeded. Rejected with error when
     * encountered.
     * @param {string} id Identifier that oidc-provider will use to reference this model instance for
     * future operations.
     * @param {object} payload Object with all properties intended for storage.
     * @param {integer} expiresIn Number of seconds intended for this model to be stored.
     *
     */
    async upsert(id: string, payload: AdapterPayload, _expiresIn?: number): Promise<void> {
        const modelId = `${this.name}-${id}`
        // logger.info({
        //     message: 'Adapter "upsert" action logged',
        //     meta: {
        //         action: 'DynamoDbAdapterUpsert',
        //         modelId,
        //     },
        // })
        const { kind } = payload
        switch (kind?.toUpperCase()) {
            case 'AUTHORIZATIONCODE':
                await OidcProviderModelService.upsertModel(
                    modelId,
                    ModelType.AuthCode,
                    {}, 
                    payload,
                )
                return
            case 'CLIENT':
                const expiresAt = config.get('ttl').oidcProvider
                await OidcProviderModelService.upsertModel(
                    modelId,
                    ModelType.Client,
                    { expiresAt },
                    payload,
                )
                return
            case 'GRANT':
                await OidcProviderModelService.upsertModel(
                    modelId,
                    ModelType.Grant,
                    {}, 
                    payload,
                )
                return
            case 'INTERACTION':
                await OidcProviderModelService.upsertModel(
                    modelId,
                    ModelType.Interaction,
                    {}, 
                    payload,
                )
                return
            case 'SESSION':
                await OidcProviderModelService.upsertModel(
                    modelId,
                    ModelType.Session,
                    {}, 
                    payload,
                )
                return
            default:
                console.log(payload, 'Letting payload pass through')
                return
        }
    }

    /**
     *
     * Return previously stored instance of an oidc-provider model.
     *
     * @return {Promise} Promise fulfilled with what was previously stored for the id (when found and
     * not dropped yet due to expiration) or falsy value when not found anymore. Rejected with error
     * when encountered.
     * @param {string} id Identifier of oidc-provider model
     *
     */
    async find(id: string): Promise<AdapterPayload | undefined> {
        const modelId = `${this.name}-${id}`
        // logger.info({
        //     message: 'Adapter "find" action logged',
        //     meta: {
        //         action: 'DynamoDbAdapterFind',
        //         modelId,
        //     },
        // })
        const modelResult = await OidcProviderModelService.getModelByModelId(modelId)
        return validateModel(modelResult)
    }

    /**
     *
     * Return previously stored instance of DeviceCode by the end-user entered user code. You only
     * need this method for the deviceFlow feature
     *
     * @return {Promise} Promise fulfilled with the stored device code object (when found and not
     * dropped yet due to expiration) or falsy value when not found anymore. Rejected with error
     * when encountered.
     * @param {string} userCode the user_code value associated with a DeviceCode instance
     *
     */
    async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
        // logger.info({
        //     message: 'Adapter "findByUserCode" action logged',
        //     meta: {
        //         action: 'DynamoDbAdapterFindByUserCode',
        //     },
        // })
        const modelResult = await OidcProviderModelService.getModelByGsi({ userCode })
        return validateModel(modelResult)
    }

    /**
     *
     * Return previously stored instance of Session by its uid reference property.
     *
     * @return {Promise} Promise fulfilled with the stored session object (when found and not
     * dropped yet due to expiration) or falsy value when not found anymore. Rejected with error
     * when encountered.
     * @param {string} uid the uid value associated with a Session instance
     *
     */
    async findByUid(uid: string): Promise<AdapterPayload | undefined> {
        // logger.info({
        //     message: 'Adapter "findByUid" action logged',
        //     meta: {
        //         action: 'DynamoDbAdapterFindByUid',
        //     },
        // })
        const modelResult = await OidcProviderModelService.getModelByGsi({ uid })
        return validateModel(modelResult)
    }

    /**
     *
     * Mark a stored oidc-provider model as consumed (not yet expired though!). Future finds for this
     * id should be fulfilled with an object containing additional property named "consumed" with a
     * truthy value (timestamp, date, boolean, etc).
     *
     * @return {Promise} Promise fulfilled when the operation succeeded. Rejected with error when
     * encountered.
     * @param {string} id Identifier of oidc-provider model
     *
     */
    async consume(id: string): Promise<void> {
        // logger.info({
        //     message: 'Adapter "consume" action logged',
        //     meta: {
        //         action: 'DynamoDbAdapterConsume',
        //     },
        // })
        const modelId = `${this.name}-${id}`
        await OidcProviderModelService.consumeModelByModelId(modelId)
    }

    /**
     *
     * Destroy/Drop/Remove a stored oidc-provider model. Future finds for this id should be fulfilled
     * with falsy values.
     *
     * @return {Promise} Promise fulfilled when the operation succeeded. Rejected with error when
     * encountered.
     * @param {string} id Identifier of oidc-provider model
     *
     */
    async destroy(id: string): Promise<void> {
        // logger.info({
        //     message: 'Adapter "destroy" action logged',
        //     meta: {
        //         action: 'DynamoDbAdapterDestroy',
        //     },
        // })
        const modelId = `${this.name}-${id}`
        await OidcProviderModelService.deleteModelByModelId(modelId)
    }

    /**
     *
     * Destroy/Drop/Remove a stored oidc-provider model by its grantId property reference. Future
     * finds for all tokens having this grantId value should be fulfilled with falsy values.
     *
     * @return {Promise} Promise fulfilled when the operation succeeded. Rejected with error when
     * encountered.
     * @param {string} grantId the grantId value associated with a this model's instance
     *
     */
    async revokeByGrantId(grantId: string): Promise<void> {
        // logger.info({
        //     message: 'Adapter "revokeByGrantId" action logged',
        //     meta: {
        //         action: 'DynamoDbAdapterRevokeByGrantId',
        //     },
        // })
        await OidcProviderModelService.deleteAllModelsWithGrantId(grantId)
    }
}