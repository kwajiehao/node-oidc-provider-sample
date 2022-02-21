/* eslint-disable @typescript-eslint/no-var-requires, no-console */
/**
 * Reference:
 * https://www.oauth.com/oauth2-servers/client-registration/client-id-secret/
 */
require('dotenv').config()

const bcrypt = require('bcrypt')
const crypto = require('crypto')
const fs = require('fs')
const inquirer = require('inquirer')
const jose = require('node-jose')

const clientTable = process.env.PROVIDER_TABLE
if (!clientTable) throw Error('OGPass client table name not provided')

const randomHexString = (length) => {
  return crypto.randomBytes(length / 2).toString('hex')
}

const generateKeyPair = async () => {
  const keyStore = jose.JWK.createKeyStore()
  const keys = await keyStore.generate('RSA', 2048, {alg: 'PS256', use: 'sig' })
  return {
    privateJwk: keys.toJSON(true),
    publicJwk: keys.toJSON(),
  }
}

const generateClientId = (clientName, env) => {
  if (!/^[A-Za-z]+$/.test(clientName)) {
    throw new Error('Invalid client name')
  }
  if (!['PROD', 'TEST'].includes(env)) {
    throw new Error('Invalid env')
  }
  return `${clientName}-${env}`.toUpperCase()
}

// Use the hash as the secret - for client_secret_basic, the provider receives the
// base 64 + form encoded version so there's no need to compare hashes
const generateSecret = () => {
  const secret = randomHexString(32)
  const secretHash = bcrypt.hashSync(secret, 10)
  return secretHash
}

const questions = [
  {
    type: 'input',
    name: 'clientName',
    message: 'Enter a name for your client:',
    default: 'OgpTest'
  },
  {
    type: 'list',
    name: 'env',
    message: 'Select credential env:',
    choices: ['PROD', 'TEST'],
  },
  {
    type: 'input',
    name: 'clientUri',
    message: 'Enter your client website (optional):',
    default: ''
  },
  {
    type: 'input',
    name: 'contacts',
    message: 'Enter your a contact email (optional):',
    default: []
  },
  {
    type: 'input',
    name: 'logoUri',
    message: `Enter a URL link to your client's logo (optional):`,
    default: ''
  },
  {
    type: 'input',
    name: 'redirectUri',
    message: `Enter your client's redirect URI:`,
    default: 'http://localhost:3000'
  },
  {
    type: 'checkbox',
    name: 'oidcScope',
    message: 'Select scope:',
    choices: [
      'myinfo.nric_number',
      'myinfo.name',
      'myinfo.email',
      'myinfo.mobile_number',
      'myinfo.registered_address',
      'myinfo.date_of_birth',
      'myinfo.passport_number',
      'myinfo.passport_expiry_date',
    ],
  },
]

const cleanClientRegistration = (clientRegistration) => {
  const stringifiedClientReg = JSON.stringify(clientRegistration)
  return `${stringifiedClientReg.replace(/"/g, '\"')}`
}

// This script does 2 things:
// 1. Logs information that the client needs to know to the console
// 2. Generates a `client-registration.json` file for OGPass to register in
// our clients table
const main = async () => {
  const answers = await inquirer.prompt(questions)
  const {
    clientName,
    clientUri,
    contacts,
    env,
    logoUri,
    oidcScope,
    redirectUri,
  } = answers
  const clientId = generateClientId(clientName, env)
  const clientSecret = generateSecret()
  const { privateJwk, publicJwk } = await generateKeyPair()

  const scope = ['openid', ...oidcScope].join(' ')
  
  const clientInfo = {
    clientId,
    clientSecret,
    redirectUri,
    privateJwk,
    publicJwk,
    scope,
  }
  const clientRegistration = {
    application_type: 'web',
    authorization_signed_response_alg: 'PS256',
    client_id: clientId,
    client_secret: clientSecret,
    contacts,
    grant_types: ['authorization_code'],
    id_token_signed_response_alg: 'PS256',
    introspection_signed_response_alg: 'PS256',
    jwks: {
      // !To-do: check whether we should be collecting the private or public jwk
      keys: [publicJwk]
    },
    redirect_uris: [redirectUri],
    require_auth_time: false,
    response_types: ['code'],
    scope,
    subject_type: 'public',
    token_endpoint_auth_method: env === 'TEST' ? 'none': 'client_secret_basic',
    userinfo_signed_response_alg: 'PS256',      
  }

  // Attributes for which values must be a non-empty string if provided
  if (clientUri) clientRegistration.client_uri = clientUri
  if (logoUri) clientRegistration.logo_uri = logoUri

  // Log client info to console
  console.log(JSON.stringify(clientInfo, null, 4))

  // Generate client registration json
  const dynamodbRegistration = {
    TableName: clientTable,
    Item: {
      modelId: {
        S: `Client-${clientId}`
      },
        payload: {
            S: cleanClientRegistration(clientRegistration)
        }
    }
  }
  fs.writeFileSync(
    `${__dirname}/client-registration.json`, 
    JSON.stringify(dynamodbRegistration, null, 4)
  )
}

main()
