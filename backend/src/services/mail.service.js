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
    // Nodemailer waits up to two minutes for a relay that never answers (for
    // example when the host blocks SMTP ports), which would hang the request.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })

  return transporter
}

// "ReFon <hello@example.com>" -> { name: 'ReFon', email: 'hello@example.com' }
function parseAddress(address) {
  const match = address.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  return match ? { name: match[1] || undefined, email: match[2] } : { email: address.trim() }
}

// Brevo's HTTP API goes out over HTTPS, so it still works on hosts that block
// outbound SMTP ports (Render's free tier does).
async function sendWithBrevo({ to, subject, text, html }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.brevoApiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: parseAddress(env.mailFrom),
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`Brevo answered ${response.status}: ${(await response.text()).slice(0, 300)}`)
  }
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

// With `background`, a relay send is started but not awaited, so the caller's
// request does not wait on the relay; failures are only logged.
export async function sendMail({ to, subject, text, html }, { background = false } = {}) {
  if (!env.smtpHost && !env.brevoApiKey) {
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

  const delivery = (
    env.brevoApiKey
      ? sendWithBrevo({ to, subject, text, html })
      : getTransporter().sendMail({
          from: env.mailFrom,
          to,
          subject,
          text,
          html,
        })
  ).then(() => console.log(`[mail] sent "${subject}" to ${to}`))

  if (!background) {
    await delivery
    return
  }

  delivery.catch((error) => console.error(`[mail] could not send "${subject}" to ${to}:`, error.message))
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

export async function sendEmailVerificationEmail({ to, name, token }, options) {
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
  }, options)
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  )
}

/**
 * An order update by email: a heading, a few lines, and a button to the order.
 * `lines` are plain text and escaped here. Sent in the background, so a slow or
 * failing relay never holds up the order itself.
 */
export function sendOrderEmail({ to, subject, heading, lines, actionLabel, path: actionPath }) {
  const url = `${env.appUrl}${actionPath}`
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6;color:#0f1f33">
      <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h1>
      ${lines.map((line) => `<p style="margin:0 0 10px">${escapeHtml(line)}</p>`).join('')}
      <p style="margin:18px 0 24px">
        <a href="${url}" style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(actionLabel)}</a>
      </p>
      <p style="margin:0;font-size:13px;color:#64748b">ReFon · You get this email because of an order on your account.</p>
    </div>
  `
    .trim()
    .replace(/\n\s+/g, '\n')

  return sendMail(
    { to, subject, text: [heading, '', ...lines, '', url].join('\n'), html },
    { background: true },
  ).catch((error) => console.error(`[mail] order email "${subject}" failed:`, error.message))
}
