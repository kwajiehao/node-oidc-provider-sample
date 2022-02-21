import { SendMailOptions } from 'nodemailer'
import { PartialRequired } from '../utils/types'

export type MailArguments = SendMailOptions & PartialRequired<
    SendMailOptions,
    'to'
    | 'subject'
    | 'text'
>