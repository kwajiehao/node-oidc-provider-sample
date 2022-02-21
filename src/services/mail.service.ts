import nodemailer from 'nodemailer'
import config from '../config'
import { MailArguments } from '../types/mail'
import { logger } from './logger.service'

let mailTransporter: nodemailer.Transporter
  
mailTransporter = nodemailer.createTransport({
  service: 'Zoho', // no need to set host or port etc.
  secure: true, //ssl
  auth: {
    user: config.get('email').emailAddress,
    pass: config.get('email').emailPassword,
  },
})

export const sendTestEmail = async (recipient: string): Promise<void> => {
  let info = await transporter.sendMail({
    from: config.get('email').emailAddress,
    to: recipient,
    subject: "Hello ✔", 
    text: "Hello world?",
    html: "<b>Hello world?</b>",
  })

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
}

const sendEmail = async (mailOptions: MailArguments): Promise<void> => {
  const logMeta = {
    action: 'Send mail',
    recipient: mailOptions.to,
  }
  logger.info({
    message: 'Preparing to send mail...',
    meta: logMeta,
  })
  await transporter.sendMail({
    from: config.get('email').emailAddress,
    to: mailOptions.to,
    subject: mailOptions.subject, 
    text: mailOptions.text,
  })
  logger.info({
    message: 'Send mail complete!',
    meta: logMeta,
  })
}

export const sendSgidSignupEmail = async ({
  recipient,
  sgidRedirectUrl,
}: {
  recipient: string
  sgidRedirectUrl: string
}): Promise<void> => {
  await sendEmail({
    to: recipient,
    subject: 'Thank you for signing up for OGPass!',
    text: `Dear user,
    
    Hello from the Open Governments Product (OGP) team! Thank you for signing up for OGPass. To continue with your registration, please login with your SingPass app at the following link: ${sgidRedirectUrl}`,
  })
}

export const transporter = mailTransporter
