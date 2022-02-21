import { createLogger, format, transports } from 'winston'
import { SPLAT } from 'triple-beam'
import { inspect } from 'util'
import axios, { AxiosError } from 'axios'
import { pick } from 'lodash'

import config from '../config'

/**
 * Keys from Axios response to be logged
 */
const AXIOS_ERROR_KEYS_TO_LOG = [
  'config.url',
  'config.method',
  'config.data',
  'config.baseURL',
  'config.timeout',
  'response.status',
  'response.headers',
  'response.data',
]

/**
 * Hunts for errors in the given object passed to the logger.
 * Assigns the `error` key the found error.
 */
const errorHunter = format((info) => {
  if (info.error) return info

  // The SPLAT symbol is a key which contains additional arguments
  // passed to the logger. Hence search that array for any instances
  // of errors.
  const splat = info[SPLAT as any] || []
  info.error = splat.find((obj: any) => obj instanceof Error)

  return info
})

/**
 * This is required as JSON.stringify(new Error()) returns an empty object. This
 * function converts the error in `info.error` into a readable JSON stack trace.
 *
 * Function courtesy of
 * https://github.com/winstonjs/winston/issues/1243#issuecomment-463548194.
 */
const jsonErrorReplacer = (_key: string, value: unknown) => {
  const valueError = (value as any)?.error
  if (valueError && axios.isAxiosError(valueError)) {
    ;(value as any).error = pick(
      (value as { error: AxiosError }).error,
      AXIOS_ERROR_KEYS_TO_LOG,
    )
    return value
  }
  if (value instanceof Error) {
    return Object.getOwnPropertyNames(value).reduce((all, valKey) => {
      if (valKey === 'stack') {
        const errStack = value.stack ?? ''
        return {
          ...all,
          at: errStack
            .split('\n')
            .filter((va) => va.trim().slice(0, 5) !== 'Error')
            .map((va, i) => `stack ${i} ${va.trim()}`),
        }
      } else {
        return {
          ...all,
          [valKey]: value[valKey as keyof Error],
        }
      }
    }, {})
  } else {
    return value
  }
}

/**
 * Formats the error in the transformable info to a console.error-like format.
 */
const errorPrinter = format((info) => {
  if (!info.error) return info

  // Handle case where Error has no stack.
  const errorMsg = info.error.stack || info.error.toString()
  info.message += `\n${errorMsg}`

  return info
})

const isPrimitive = (val: unknown): boolean => {
  return val === null || (typeof val !== 'object' && typeof val !== 'function')
}

/**
 * Formats a log message for readability.
 * Adapted from
 * https://github.com/winstonjs/winston/issues/1427#issuecomment-583199496
 */
const formatWithInspect = (val: unknown): string => {
  // Custom handling to get useful info from Axios errors
  if (axios.isAxiosError(val)) {
    return inspect(pick(val, AXIOS_ERROR_KEYS_TO_LOG), {
      depth: null,
      colors: true,
    })
  }
  // We have a custom method for printing errors, so ignore errors here
  if (val instanceof Error) {
    return ''
  }
  const formattedVal =
    typeof val === 'string' ? val : inspect(val, { depth: null, colors: true })
  return isPrimitive(val) ? formattedVal : `\n${formattedVal}`
}

/**
 * A custom formatter for winston. Transforms winston's info object into a
 * string representation, mainly used for console logging.
 */
export const formatLogMessage = format.printf((info) => {
  // Handle multiple arguments passed into logger
  // e.g. logger.info('param1', 'param2')
  // The second parameter onwards will be passed into the `splat` key and
  // require formatting (because that is just how the library is written).
  const splatArgs = info[SPLAT as any] || []
  const rest = splatArgs
    .map((data: unknown) => formatWithInspect(data))
    .join('\n')
  return `${info.timestamp} ${info.level}: ${formatWithInspect(
    info.message,
  )}\t${rest}`
})

const _logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.errors({ stack: true }),
    format.timestamp(),
    errorHunter(),
    config.get('env') === 'production'
      ? format.json({ replacer: jsonErrorReplacer })
      : format.combine(format.colorize(), errorPrinter(), formatLogMessage),
  ),
  transports: new transports.Console(),
  exitOnError: false,
})

export type LogMeta = {
    // Name of logging function
    action: string
    [other: string]: unknown
}

/**
 * Type of object passed to logger. We wrap Winston's logger methods
 * in a custom function which forces consumers to log in this shape.
 */
type CustomLoggerParams = {
  message: string
  meta: LogMeta
  error?: unknown
}

export const logger = {
  info: (params: Omit<CustomLoggerParams, 'error'>) => {
    const { message, meta } = params
    return _logger.info(message, { meta })
  },
  warn: (params: CustomLoggerParams) => {
    const { message, meta, error } = params
    if (error) {
      return _logger.warn(message, { meta }, error)
    }
    return _logger.warn(message, { meta })
  },
  error: (params: CustomLoggerParams) => {
    const { message, meta, error } = params
    if (error) {
      return _logger.error(message, { meta }, error)
    }
    return _logger.error(message, { meta })
  },
}
