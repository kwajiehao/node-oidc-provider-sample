import crypto from 'crypto'
import bcrypt from 'bcrypt'
import _ from 'lodash'

import { BASE64_ENC } from '../constants'

const MASTER_KEY_BYTELENGTH = 32
const DEFAULT_BCRYPT_SALT_ROUNDS = 10

// Generate a key with hash
function generateKeyAndHash(): { key: string; hash: string } {
  // Generate key randomly
  const key = crypto.randomBytes(MASTER_KEY_BYTELENGTH).toString(BASE64_ENC)
  // Hash key with bcrypt
  const hash = bcrypt.hashSync(key, DEFAULT_BCRYPT_SALT_ROUNDS)
  return { key, hash }
}

export function generateHashFromString(inputString: string): string {
  return bcrypt.hashSync(inputString, DEFAULT_BCRYPT_SALT_ROUNDS)
}