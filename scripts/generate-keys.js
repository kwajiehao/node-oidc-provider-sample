// This script was adapted from https://github.com/panva/node-oidc-provider-example
const fs = require('fs')
const path = require('path')
const jose = require('node-jose')

const keystore = jose.JWK.createKeyStore()

Promise.all([
  keystore.generate('RSA', 2048, { use: 'sig' }),
  keystore.generate('EC', 'P-256', { use: 'sig', alg: 'ES256' }),
]).then(() => {
  fs.writeFileSync(path.resolve('./jwks.json'), JSON.stringify(keystore.toJSON(true), null, 2))
})
