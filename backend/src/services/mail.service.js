import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

export const mailOutboxPath = path.resolve(currentDirectory, '../../tmp/mail-outbox.jsonl')

let transporter

function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
  })

  return transporter
}

async function appendToOutbox(message) {
  await fs.mkdir(path.dirname(mailOutboxPath), { recursive: true })
  await fs.appendFile(mailOutboxPath, `${JSON.stringify(message)}\n`, 'utf8')
}

function layout(heading, body, actionLabel, actionUrl) {
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6;color:#0f1f33">
      <h1 style="font-size:20px;margin:0 0 16px">${heading}</h1>
      <p style="margin:0 0 16px">${body}</p>
      <p style="margin:0 0 24px">
        <a href="${actionUrl}" style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">${actionLabel}</a>
      </p>
      <p style="margin:0;font-size:13px;color:#64748b">If the button does not work, open this link:<br>${actionUrl}</p>
      <p style="margin:16px 0 0;font-size:13px;color:#64748b">This link expires soon and can only be used once. If you did not request this, you can ignore this email.</p>
    </div>
  `
    .trim()
    .replace(/\n\s+/g, '\n')
}

export async function sendMail({ to, subject, text, html }) {
  if (!env.smtpHost) {
    await appendToOutbox({
      to,
      subject,
      text,
      html,
      createdAt: new Date().toISOString(),
    })
    // Never log the body: it carries single-use tokens.
    console.log(`[mail] no SMTP relay, wrote "${subject}" for ${to} to the local outbox`)
    return
  }

  await getTransporter().sendMail({
    from: env.mailFrom,
    to,
    subject,
    text,
    html,
  })
  console.log(`[mail] sent "${subject}" to ${to}`)
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const url = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`
  const heading = 'Reset your ReFon password'

  await sendMail({
    to,
    subject: 'Reset your ReFon password',
    text: [
        `Hi ${name},`,
        '',
        'Use the link below to choose a new ReFon password. It expires in 1 hour and can only be used once.',
        '',
        url,
        '',
        'If you did not request a password reset, you can ignore this email.',
      ].join('\n'),
    html: layout(
      heading,
      `Hi ${name}, use the button below to choose a new ReFon password.`,
      'Choose a new password',
      url,
    ),
  })
}

export async function sendEmailVerificationEmail({ to, name, token }) {
  const url = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`
  const heading = 'Verify your ReFon email'

  await sendMail({
    to,
    subject: 'Verify your ReFon email address',
    text: [
        `Hi ${name},`,
        '',
        'Confirm your email address to keep your ReFon account secure.',
        '',
        url,
        '',
        'This link expires in 24 hours. If you did not create this account, you can ignore this email.',
      ].join('\n'),
    html: layout(
      heading,
      `Hi ${name}, confirm your email address to keep your ReFon account secure.`,
      'Verify my email',
      url,
    ),
  })
}
