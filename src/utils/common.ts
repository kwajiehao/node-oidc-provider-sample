import camelcaseKeys from 'camelcase-keys'
import snakecaseKeys from 'snakecase-keys'

export function isSubArray(array: any[], subarray: any[]): boolean {
  const set = new Set(array)
  return subarray.every((e) => set.has(e))
}

export function secondsSinceEpoch(): number {
  return Math.floor(Date.now() / 1000)
}

export function camelcaseShallow<T extends Record<string, unknown>>(obj: T): T {
  return camelcaseKeys(obj, { deep: false })
}

export function snakecaseShallow<T extends Record<string, unknown>>(obj: T): T {
  return snakecaseKeys(obj, { deep: false })
}

export function safeJsonParse(
  jsonString: string
): string | Record<string, unknown> {
  try {
    return JSON.parse(jsonString)
  } catch (_) {
    return jsonString
  }
}

/**
 * Used to manually generate Date number in db
 */
export function getSecondsSinceEpoch(): number {
  return Math.round(Date.now() / 1000)
}

/**
 * Utility to narrow type of an object by determining whether
 * it contains the given property.
 * @param obj Object
 * @param prop Property to check
 */

export const hasProp = <K extends string>(
  obj: unknown,
  prop: K,
): obj is Record<K, unknown> => {
  return typeof obj === 'object' && obj !== null && prop in obj
}
