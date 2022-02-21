import { logger } from '../services/logger.service'

export const logOidcProviderError = (
    err: any,
    {
        message,
        action,
        metadata,
    }: {
        message: string,
        action: string,
        metadata: object
    },
) => {
    logger.error({
        message,
        meta: {
            action,
            errorName: err?.name,
            errorMessage: err?.message,
            ...metadata,
        },
    })
}