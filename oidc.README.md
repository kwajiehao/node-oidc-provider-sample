## Appendix: how does `node-oidc-provider` work?

The documentation is a little haphazard, and might not be immediately understandable to those who do not have a detailed understanding of the OIDC specifications. This document will offer a guide to navigating the repo by breaking it down to a few major topics.

Note for debugging `node-oidc-provider`: set the env var `export DEBUG=oidc-provider:* ` before starting the server.

## Overview

The structure of the repo is a little unorthodox, due to how `node-oidc-provider` works. For example, no `/auth` endpoint is defined, despite that being the authorization endpoint defined by our app. Instead, we use the `node-oidc-provider`'s concepts of `Interactions` and `Prompts`. Refer to the **User Flows** section in the `node-oidc-provider` repo's `README.md` file for more details. 

How this works:
1. When a request is made to the `/auth` endpoint, an internal 404 is triggered and the user is redirected to the `/interactions/:uid` endpoint courtesy of the `interactions.url` function
2. This endpoint renders a view that prompts users to authenticate. The form is submitted as a POST request to the `/interactions/:uid/login` endpoint, where we implement logic for redirecting the user to the sgID QR code for authentication
3. Upon authenticating with sgID, sgID should redirect the user back to a `/interactions/confirm` endpoint where the user is prompted to authorize the OGP client app to receive their work email. Note that we will store the UID from step 2 as a nonce or state to be returned here
4. Upon authorization, the user is redirected back to the OGP client app

### Clients

Refer to **Clients** section in the `node-oidc-provider` repo's **Configuration options** to see the list of available metadata needed to configure a client. For futher clarification, all of the client metadata attributes are attributes defined in either the OAuth 2.0 or OIDC specifications.

Relevant files:
- `lib/consts/client-attributes.js` - client registration requirements
- `lib/models/client.js` - client retrieval and validation

### Interaction Policy

This section is **extremely** important. For more details, refer to the **interactions.policy** section of the `node-oidc-provider` repo. Note that for this section, you need to have an understanding of **prompts** and **checks** in an OIDC context.

The interaction policy that you set **determines the OIDC flow that your user will go through**. The default value set is (shortened for readability):
```
[
/* LOGIN PROMPT */
new Prompt(
  { name: 'login', requestable: true },

  (ctx) => {
    const { oidc } = ctx;

    return {
      ...(oidc.params.max_age === undefined ? undefined : { max_age: oidc.params.max_age }),
      ...(oidc.params.login_hint === undefined ? undefined : { login_hint: oidc.params.login_hint }),
      ...(oidc.params.id_token_hint === undefined ? undefined : { id_token_hint: oidc.params.id_token_hint }),
    };
  },

  new Check('no_session', 'End-User authentication is required', (ctx) => {
    const { oidc } = ctx;
    if (oidc.session.accountId) {
      return Check.NO_NEED_TO_PROMPT;
    }

    return Check.REQUEST_PROMPT;
  }),

  <other checks needed for login>,
)

/* CONSENT PROMPT */
new Prompt(
  { name: 'consent', requestable: true },

  new Check('native_client_prompt', 'native clients require End-User interaction', 'interaction_required', (ctx) => {
    const { oidc } = ctx;
    if (
      oidc.client.applicationType === 'native'
      && oidc.params.response_type !== 'none'
      && (!oidc.result || !('consent' in oidc.result))
    ) {
      return Check.REQUEST_PROMPT;
    }

    return Check.NO_NEED_TO_PROMPT;
  }),

  new Check('op_scopes_missing', 'requested scopes not granted', (ctx) => {
    const { oidc } = ctx;
    const encounteredScopes = new Set(oidc.grant.getOIDCScopeEncountered().split(' '));

    let missing;
    for (const scope of oidc.requestParamOIDCScopes) { // eslint-disable-line no-restricted-syntax
      if (!encounteredScopes.has(scope)) {
        missing || (missing = []);
        missing.push(scope);
      }
    }

    if (missing && missing.length) {
      ctx.oidc[missingOIDCScope] = missing;
      return Check.REQUEST_PROMPT;
    }

    return Check.NO_NEED_TO_PROMPT;
  }, ({ oidc }) => ({ missingOIDCScope: oidc[missingOIDCScope] })),

  <other checks needed for consent>,
)
]
```
