import 'dotenv/config'
import convict from 'convict'
import jose from 'node-jose'

const requiredValue = (val: any): void => {
  if (val === '') throw new Error('Required value cannot be empty')
}
const parseKeys = (val: any): string => val.replace(/(\\n)/g, '\n')
const parseJwks = (val: any): { [key: string]: string } => JSON.parse(val) // This is faulty

convict.addFormats({
  'required-string': {
    validate: requiredValue,
  },
  'required-pems': {
    validate: requiredValue,
    coerce: parseKeys,
  },
  'required-jwks': {
    validate: requiredValue,
    coerce: parseJwks,
  },
})

const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'staging', 'development', 'test'],
    default: 'production',
    env: 'NODE_ENV',
  },
  hostname: {
    doc: 'Hostname of server',
    format: String,
    default: 'http://localhost:3000',
    env: 'HOSTNAME',
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3000,
    env: 'PORT',
  },
  email: {
    emailAddress: {
      doc: 'Email address to send from',
      format: String,
      default: '',
      env: 'EMAIL_ADDRESS',
    },
    emailPassword: {
      doc: 'Password associated with the email address to send from',
      format: String,
      default: '',
      env: 'EMAIL_PASSWORD'
    }
  },
  aws: {
    region: {
      doc: 'AWS region',
      format: 'required-string',
      default: 'ap-southeast-1',
      env: 'AWS_REGION',
    },
    accessId: {
      doc: 'AWS Access ID',
      format: '*',
      default: '',
      env: 'AWS_ACCESS_KEY_ID',
    },
    secretKey: {
      doc: 'AWS Secret Key',
      format: '*',
      default: '',
      env: 'AWS_SECRET_ACCESS_KEY',
    },
    sessionToken: {
      doc: 'AWS Session Token',
      format: '*',
      default: '',
      env: 'AWS_SESSION_TOKEN',
    },
    dbHost: {
      doc: 'dynamodb host name',
      format: 'required-string',
      default: '',
      env: 'DB_HOST',
    },
    dbTablePrefix: {
      doc: 'Prefixes for tables in db',
      format: ['', 'dev-', 'stg-', 'prod-'],
      default: '',
      env: 'DB_TABLE_PREFIX',
    },
  },
  oidc: {
    issuer: {
      doc: 'Name of OIDC provider',
      format: String,
      default: 'http://localhost:3000',
      env: 'OIDC_ISSUER',
    },
  },
  sgid: {
    clientId: {
      doc: 'Client ID for OGPass with sgID',
      format: String,
      default: 'OGPASS-TEST',
      env: 'SGID_CLIENT_ID',
    },
    clientSecret: {
      doc: 'Client secret for OGPass with sgID',
      format: String,
      default: '',
      env: 'SGID_CLIENT_SECRET',
    },
    authEndpoint: {
      doc: 'sgID authorization endpoint',
      format: String,
      default: 'https://api.id.gov.sg',
      env: 'SGID_AUTH_ENDPOINT',
    },
    privateKey: {
      doc: 'Client private key for OGPass with sgID',
      format: 'required-pems',
      sensitive: true,
      default: '',
      env: 'SGID_PRIVATE_KEY',
    },
    publicKey: {
      doc: 'Client public key for OGPass with sgID',
      format: 'required-pems',
      default: '',
      env: 'SGID_PUBLIC_KEY',
    },
    redirectUri: {
      doc: 'Redirect URI for use with sgID, in accordance with OAuth 2.0 spec',
      format: String,
      default: 'http://localhost:3000/sgid/callback',
      env: 'SGID_REDIRECT_URI',
    },
    scopes: {
      doc: 'OpenID scopes requested from sgID by OGPass',
      format: String,
      default: 'openid myinfo.name',
      env: 'SGID_SCOPES',
    },
  },
  ttl: {
    authRequest: {
      doc: 'TTL for auth request in seconds',
      format: Number,
      default: 300,
      env: 'AUTH_REQUEST_TTL',
    },
    accessToken: {
      doc: 'TTL for access token in seconds',
      format: Number,
      default: 300,
      env: 'ACCESS_TOKEN_TTL',
    },
    oidcProvider: {
      doc: 'TTL for OIDC provider model in seconds',
      format: Number,
      default: 300,
      env: 'OIDC_PROVIDER_MODEL_TTL',
    },
    ssoSession: {
      doc: 'TTL for SSO sessions in seconds',
      format: Number,
      default: 172800, // 2 days
      env: 'SSO_SESSION_TTL',
    },
  },
  keys: {
    jwtPrivateKey: {
      doc: 'OpenID Provider RSA private key 2048 bit',
      format: 'required-string',
      sensitive: true,
      default: '',
      env: 'JWT_PRIVATE_KEY',
    },
    jwtPublicKey: {
      doc: 'OpenID Provider RSA public key 2048 bit',
      format: 'required-string',
      default: '',
      env: 'JWT_PUBLIC_KEY',
    },
  },
})

const envDependentConfig = () => {
  switch (config.get('env')) {
    case 'development':
      return {
        email: {
          emailAddress: process.env.EMAIL_ADDRESS,
          emailPassword: process.env.EMAIL_PASSWORD,
        }
      }
    default:
      return {}
  }}

// Load additional config
config.load(envDependentConfig())

// Perform validation
config.validate({ allowed: 'strict' })

export default config
