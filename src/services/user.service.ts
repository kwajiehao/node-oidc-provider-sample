import { UpdateExpression, AttributePath } from '@aws/dynamodb-expressions'

import { logger } from '../services/logger.service'
import { User } from '../models'
import { NotFoundError } from '../errors'
import { CreateUser, UpdateUser } from '../types/user'
import { DbService } from './dynamodb.service'

const userSubGsi = 'userIdentifier-index'
const userStateGsi = 'userState-index'

class UserService {
    /**
    * Creates new user object in user table
    * @param govEmail user's government email
    * @returns 
    */
    async create(
        newUser: CreateUser
    ): Promise<{ user: User }> {
        const { govEmail, state } = newUser
        const userToPut = new User().create({ govEmail, state })
        const user = await DbService.put(userToPut)
        logger.info({
            message: 'Successfully created user',
            meta: {
                action: 'Created user',
                userEmail: user.govEmail,
            }
        })
        return { user }
    }

    /**
     * @param updatedUser
     * @returns
     */
    async update(userUpdateArgs: UpdateUser): Promise<User> {
        const userToUpdate = new User().create(userUpdateArgs)
        return await DbService.update(userToUpdate, {
            onMissing: 'skip', // Do not remove existing properties from item
        })
    }

    async retrieve(govEmail: string): Promise<User> {
        const userToGet = new User().create({ govEmail })
        const user = await DbService.getSafe(userToGet)

        // We might want to validate the user's session key here
        if (!user) {
            logger.error({
                message: 'User could not be found',
                meta: {
                    action: 'Retrieve user',
                    govEmail,
                },
            })
            throw new NotFoundError('User could not be found')
        }
        return user
    }

    async retrieveBySub(sub: string): Promise<User | null> {
        const gsiSearchArgs = { sub }
        const results = await DbService.queryAsync(
            User,
            gsiSearchArgs,
            {
                indexName: userSubGsi,
                //TODO: store User model attributes for re-use instead of hardcoding them here
                projection: ['govEmail', 'sub', 'ssoSessionId', 'userData'],
                limit: 1,
            }
        )
    
        if (results.length === 0) {
            return null
        }
        return results[0]
    }

    async retrieveByState(state: string): Promise<User | null> {
        const gsiSearchArgs = { state }
        const results = await DbService.queryAsync(
            User,
            gsiSearchArgs,
            {
                indexName: userStateGsi,
                //TODO: store User model attributes for re-use instead of hardcoding them here
                projection: ['govEmail', 'sub', 'ssoSessionId', 'userData'],
                limit: 1,
            }
        )
    
        if (results.length === 0) {
            return null
        }
        return results[0]
    }
}

const instance = new UserService()

export { instance as UserService }