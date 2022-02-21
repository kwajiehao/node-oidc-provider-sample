import { interactionPolicy } from 'oidc-provider'
import { Interaction } from '../../types/oidc/oidcProviderModels'
import { logger } from '../../services/logger.service'

// See interactions.policy section in the node-oidc-provider documentation
// for more details. Also check out lib/helpers/default.js in that repo
const basePolicy = interactionPolicy.base()

const interactionsUrl = async (_ctx: any, interaction: Interaction): Promise<string> => {
    logger.info({
        message: "redirecting interactions...",
        meta: {
            action: "OidcProviderInteractionsUrl",
            interactionPrompt: interaction.prompt,
        }
    })
    return `/interaction/${interaction.uid}`
}

const interactions = {
    policy: basePolicy,
    url: interactionsUrl,
}

export { interactions }