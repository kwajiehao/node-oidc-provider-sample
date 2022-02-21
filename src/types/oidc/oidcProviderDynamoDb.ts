export enum OidcGsi {
    OidcUidIndex = 'uidIndex',
    OidcUserCodeIndex = 'userCodeIndex',
    OidcGrantIdIndex = 'grantIdIndex',
}

export type GrantIdGsi = {
    grantId: string
}

export type UidGsi = {
    uid: string
}

export type UserCodeGsi = {
    userCode: string
}

export type GsiSearchArgs = GrantIdGsi | UidGsi | UserCodeGsi

export const isGrantIdGsi = (gsiSearchArgs: GsiSearchArgs): gsiSearchArgs is GrantIdGsi => (
    typeof gsiSearchArgs === 'object'
    && typeof (gsiSearchArgs as GrantIdGsi).grantId === 'string'
    && !!(gsiSearchArgs as GrantIdGsi).grantId
)
export const isUidGsi = (gsiSearchArgs: GsiSearchArgs): gsiSearchArgs is UidGsi => (
    typeof gsiSearchArgs === 'object'
    && typeof (gsiSearchArgs as UidGsi).uid === 'string'
    && !!(gsiSearchArgs as UidGsi).uid
)

export const isUserCodeGsi = (gsiSearchArgs: GsiSearchArgs): gsiSearchArgs is UserCodeGsi => (
    typeof gsiSearchArgs === 'object'
    && typeof (gsiSearchArgs as UserCodeGsi).userCode === 'string'
    && !!(gsiSearchArgs as UserCodeGsi).userCode
)