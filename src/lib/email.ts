import { Resend } from 'resend'

const resend    = new Resend(process.env.RESEND_API_KEY)
const FROM      = process.env.EMAIL_FROM ?? 'YN Finance <noreply@ynfinance.org>'
const BASE_URL  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ynfinance.org'
const RESEND_OK = !!(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your_'))

// ─── Colour tokens (mirrors the app) ────────────────────────────────────────
const K = {
  bg:      '#040d14',
  surface: '#07111a',
  border:  '#0f2030',
  bull:    '#00d4aa',
  text:    '#dce8f0',
  muted:   '#6a90a8',
  dim:     '#2a4a62',
}

// ─── Shared HTML wrapper ─────────────────────────────────────────────────────
function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>YN Finance</title>
</head>
<body style="margin:0;padding:0;background:${K.bg};font-family:'Inter',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="100%" style="max-width:580px;">

      <!-- LOGO -->
      <tr><td style="padding-bottom:28px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:linear-gradient(135deg,#00d4aa,#1e90ff);width:32px;height:32px;border-radius:8px;text-align:center;vertical-align:middle;">
              <span style="font-size:16px;line-height:32px;">⚡</span>
            </td>
            <td style="padding-left:10px;vertical-align:middle;">
              <span style="font-size:16px;font-weight:900;color:${K.text};letter-spacing:-.3px;">YN Finance</span>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- BODY -->
      ${body}

      <!-- FOOTER -->
      <tr><td style="padding-top:36px;border-top:1px solid ${K.border};">
        <p style="margin:0 0 6px;font-size:11px;color:${K.dim};">
          YN Finance · Not financial advice · <a href="${BASE_URL}/privacy" style="color:${K.dim};">Privacy</a> · <a href="${BASE_URL}/terms" style="color:${K.dim};">Terms</a>
        </p>
        <p style="margin:0;font-size:11px;color:${K.dim};">
          Questions? Reply to this email or contact <a href="mailto:support@ynfinance.org" style="color:${K.muted};">support@ynfinance.org</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── Feature list HTML ───────────────────────────────────────────────────────
const FEATURES_HTML = [
  ['📐', 'Expected Moves',      'Daily statistical ranges for ES, NQ, YM, RTY — know your risk before price opens'],
  ['🎯', 'Daily Bias',          'Bull/Bear/Neutral verdict for every major index with the technical reason behind it'],
  ['🌍', 'Macro Dashboard',     'Gold, oil, dollar, bonds, credit — the five markets smart money reads every morning'],
  ['🏦', 'Institutional Pulse', 'Wall Street consensus, earnings radar, and cross-asset positioning signals'],
  ['🎮', 'Daily Playbook',      'Bull case, bear case, 3 trade ideas, and what to avoid — before every open'],
  ['📅', 'Economic Calendar',   'High-impact events with actual vs estimate vs prior — AI-assessed for market reaction'],
  ['📰', 'Morning Brief',       'AI-synthesized narrative: what it means, what to watch, what to do'],
  ['📡', 'Live News Feed',      'Top 9 market-moving stories curated and ranked for impact every morning'],
].map(([icon, title, desc]) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${K.border};">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="width:28px;vertical-align:top;padding-top:1px;font-size:16px;">${icon}</td>
          <td style="padding-left:10px;">
            <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:${K.text};">${title}</p>
            <p style="margin:0;font-size:12px;color:${K.muted};line-height:1.5;">${desc}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
`).join('')

// ─── CTA button ──────────────────────────────────────────────────────────────
function ctaBtn(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#00d4aa,#0ea5e9);color:#040d14;font-weight:800;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">${label}</a>`
}

// ════════════════════════════════════════════════════════════════════════════
//  WELCOME EMAIL — sent on first successful payment
// ════════════════════════════════════════════════════════════════════════════
export async function sendWelcomeEmail(email: string, periodEnd?: string) {
  if (!RESEND_OK || !email) { console.warn('[email] Resend not configured or no email'); return }

  const renewDate = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '30 days from now'

  const html = wrap(`
    <!-- HERO -->
    <tr><td style="background:${K.surface};border:1px solid ${K.border};border-radius:12px;padding:32px 28px;margin-bottom:20px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:#00d4aa12;border:1px solid #00d4aa30;border-radius:100px;padding:5px 14px;margin-bottom:20px;">
        <span style="width:6px;height:6px;border-radius:50%;background:#00d4aa;display:inline-block;"></span>
        <span style="font-size:11px;font-weight:700;color:#00d4aa;letter-spacing:.1em;">SUBSCRIPTION CONFIRMED</span>
      </div>
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:900;color:${K.text};line-height:1.2;">
        You&apos;re in. Your morning edge starts now.
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:${K.muted};line-height:1.7;">
        Welcome to YN Daily Intelligence — the AI-powered morning data hub built for traders and investors who take their edge seriously. Your subscription is active and your first edition is ready.
      </p>
      <p style="margin:0 0 28px;font-size:13px;color:${K.dim};">Renews: ${renewDate} · $11.99/month · Cancel anytime</p>
      ${ctaBtn('Open Daily Intelligence →', `${BASE_URL}/daily`)}
    </td></tr>

    <tr><td style="height:20px;"></td></tr>

    <!-- FEATURES -->
    <tr><td style="background:${K.surface};border:1px solid ${K.border};border-radius:12px;padding:24px 28px;">
      <p style="margin:0 0 16px;font-size:11px;font-weight:800;color:${K.dim};letter-spacing:.14em;">WHAT YOU GET EVERY MORNING</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${FEATURES_HTML}
      </table>
    </td></tr>

    <tr><td style="height:20px;"></td></tr>

    <!-- HOW IT WORKS -->
    <tr><td style="padding:0;">
      <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:${K.text};">How it works</p>
      <p style="margin:0 0 10px;font-size:13px;color:${K.muted};line-height:1.7;">
        Every weekday before market open, our system pulls live data from financial APIs — index prices, macro ETFs, analyst ratings, earnings calendars, economic events — and feeds it into Gemini AI to synthesize your personalized daily briefing.
      </p>
      <p style="margin:0 0 10px;font-size:13px;color:${K.muted};line-height:1.7;">
        Bookmark <a href="${BASE_URL}/daily" style="color:#00d4aa;">${BASE_URL}/daily</a> and open it before every session. That&apos;s it.
      </p>
      <p style="margin:0;font-size:12px;color:${K.dim};">
        Manage or cancel your subscription anytime at <a href="${BASE_URL}/daily/manage" style="color:${K.muted};">${BASE_URL}/daily/manage</a>
      </p>
    </td></tr>
  `)

  try {
    await resend.emails.send({
      from:    FROM,
      to:      [email],
      subject: '⚡ You\'re in — YN Daily Intelligence is live for you',
      html,
    })
    console.log('[email] welcome sent to', email)
  } catch (err) {
    console.error('[email] welcome failed:', err)
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  RENEWAL EMAIL — sent on invoice.paid (monthly renewal)
// ════════════════════════════════════════════════════════════════════════════
export async function sendRenewalEmail(email: string, periodEnd?: string) {
  if (!RESEND_OK || !email) return

  const renewDate = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'next month'

  const html = wrap(`
    <tr><td style="background:${K.surface};border:1px solid ${K.border};border-radius:12px;padding:32px 28px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:${K.dim};letter-spacing:.14em;">PAYMENT CONFIRMED</p>
      <h1 style="margin:0 0 14px;font-size:22px;font-weight:900;color:${K.text};">Your subscription has renewed.</h1>
      <p style="margin:0 0 8px;font-size:14px;color:${K.muted};line-height:1.7;">
        $11.99 charged · Next renewal: ${renewDate}
      </p>
      <p style="margin:0 0 28px;font-size:13px;color:${K.dim};">
        Today&apos;s intelligence is ready — open it before the open.
      </p>
      ${ctaBtn('Open Daily Intelligence →', `${BASE_URL}/daily`)}
      <p style="margin:24px 0 0;font-size:12px;color:${K.dim};">
        Manage or cancel: <a href="${BASE_URL}/daily/manage" style="color:${K.muted};">${BASE_URL}/daily/manage</a>
      </p>
    </td></tr>
  `)

  try {
    await resend.emails.send({
      from:    FROM,
      to:      [email],
      subject: '✓ YN Daily Intelligence — $11.99 payment confirmed',
      html,
    })
    console.log('[email] renewal sent to', email)
  } catch (err) {
    console.error('[email] renewal failed:', err)
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  CANCELLATION EMAIL — sent on customer.subscription.deleted
// ════════════════════════════════════════════════════════════════════════════
export async function sendCancellationEmail(email: string, accessUntil?: string) {
  if (!RESEND_OK || !email) return

  const until = accessUntil
    ? new Date(accessUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'the end of your billing period'

  const html = wrap(`
    <tr><td style="background:${K.surface};border:1px solid ${K.border};border-radius:12px;padding:32px 28px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:${K.dim};letter-spacing:.14em;">SUBSCRIPTION CANCELLED</p>
      <h1 style="margin:0 0 14px;font-size:22px;font-weight:900;color:${K.text};">We&apos;re sorry to see you go.</h1>
      <p style="margin:0 0 10px;font-size:14px;color:${K.muted};line-height:1.7;">
        Your Daily Intelligence subscription has been cancelled. You still have full access until <strong style="color:${K.text};">${until}</strong>.
      </p>
      <p style="margin:0 0 28px;font-size:13px;color:${K.dim};">
        Changed your mind? Resubscribe anytime — your data picks up exactly where it left off.
      </p>
      ${ctaBtn('Resubscribe →', `${BASE_URL}/daily/subscribe`)}
    </td></tr>
  `)

  try {
    await resend.emails.send({
      from:    FROM,
      to:      [email],
      subject: 'YN Daily Intelligence — subscription cancelled',
      html,
    })
    console.log('[email] cancellation sent to', email)
  } catch (err) {
    console.error('[email] cancellation failed:', err)
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  PAYMENT FAILED EMAIL
// ════════════════════════════════════════════════════════════════════════════
export async function sendPaymentFailedEmail(email: string) {
  if (!RESEND_OK || !email) return

  const html = wrap(`
    <tr><td style="background:#140a0a;border:1px solid #3a0f0f;border-radius:12px;padding:32px 28px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:800;color:#7a1a1a;letter-spacing:.14em;">PAYMENT FAILED</p>
      <h1 style="margin:0 0 14px;font-size:22px;font-weight:900;color:${K.text};">Your payment didn&apos;t go through.</h1>
      <p style="margin:0 0 10px;font-size:14px;color:${K.muted};line-height:1.7;">
        We couldn&apos;t charge your card for your YN Daily Intelligence subscription. Please update your payment method to keep your access.
      </p>
      <p style="margin:0 0 28px;font-size:13px;color:${K.dim};">
        Your access will remain active during a short grace period while we retry.
      </p>
      ${ctaBtn('Update Payment Method →', `${BASE_URL}/daily/manage`)}
    </td></tr>
  `)

  try {
    await resend.emails.send({
      from:    FROM,
      to:      [email],
      subject: '⚠ YN Daily Intelligence — payment failed, action required',
      html,
    })
    console.log('[email] payment failed sent to', email)
  } catch (err) {
    console.error('[email] payment failed email error:', err)
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  DEVELOPER API — SIGNUP CONFIRMATION EMAIL
// ════════════════════════════════════════════════════════════════════════════
export async function sendApiSignupConfirmationEmail(email: string) {
  if (!RESEND_OK || !email) return

  const html = wrap(`
    <tr><td style="background:${K.surface};border:1px solid #00d4aa20;border-radius:12px;padding:36px 32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:#00d4aa10;border:1px solid #00d4aa30;border-radius:100px;padding:5px 14px;margin-bottom:24px;">
        <span style="width:6px;height:6px;border-radius:50%;background:#00d4aa;display:inline-block;"></span>
        <span style="font-size:11px;font-weight:700;color:#00d4aa;letter-spacing:.1em;">ACCOUNT CONFIRMED</span>
      </div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:${K.text};line-height:1.2;letter-spacing:-.5px;">
        Welcome to YN Finance Developer Portal.
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:${K.muted};line-height:1.7;">
        Your account is confirmed and ready. Sign in and claim your free API key &mdash; no credit card required.
      </p>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${BASE_URL}/developers" style="display:inline-block;background:linear-gradient(135deg,#00d4aa,#1e90ff);color:#040d14;font-weight:800;font-size:14px;padding:15px 40px;border-radius:8px;text-decoration:none;">Go to Developer Dashboard &rarr;</a>
      </div>
      <div style="background:#0a1825;border:1px solid ${K.border};border-radius:8px;padding:16px 18px;margin-bottom:16px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#2a4050;letter-spacing:.1em;">WHAT YOU GET FOR FREE</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;border-bottom:1px solid ${K.border};font-size:12px;color:${K.muted};">Monthly API calls</td><td style="padding:6px 0;border-bottom:1px solid ${K.border};text-align:right;font-family:monospace;font-size:12px;color:#00d4aa;">100 / month</td></tr>
          <tr><td style="padding:6px 0;border-bottom:1px solid ${K.border};font-size:12px;color:${K.muted};">Endpoints</td><td style="padding:6px 0;border-bottom:1px solid ${K.border};text-align:right;font-size:12px;color:${K.text};">5 endpoints</td></tr>
          <tr><td style="padding:6px 0;font-size:12px;color:${K.muted};">Credit card</td><td style="padding:6px 0;text-align:right;font-size:12px;color:#00d4aa;">Not required</td></tr>
        </table>
      </div>
      <p style="margin:0;font-size:12px;color:#1a3040;">Need more? Upgrade to Pro for 10,000 calls/month at $49/mo anytime from the dashboard.</p>
    </td></tr>
  `)

  try {
    await resend.emails.send({
      from:    FROM,
      to:      [email],
      subject: '⚡ Welcome to YN Finance Developer Portal — account confirmed',
      html,
    })
    console.log('[email] signup confirmation sent to', email)
  } catch (err) {
    console.error('[email] signup confirmation failed:', err)
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  DEVELOPER API — MAGIC LINK LOGIN EMAIL
// ════════════════════════════════════════════════════════════════════════════
export async function sendApiMagicLinkEmail(email: string, magicLink: string) {
  if (!RESEND_OK) { console.warn('[email] Resend not configured'); return }

  const html = wrap(`
    <tr><td style="background:${K.surface};border:1px solid #3b8eea20;border-radius:12px;padding:36px 32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:#3b8eea10;border:1px solid #3b8eea30;border-radius:100px;padding:5px 14px;margin-bottom:24px;">
        <span style="width:6px;height:6px;border-radius:50%;background:#3b8eea;display:inline-block;"></span>
        <span style="font-size:11px;font-weight:700;color:#3b8eea;letter-spacing:.1em;">DEVELOPER PORTAL &middot; SIGN IN</span>
      </div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:${K.text};line-height:1.2;letter-spacing:-.5px;">Your sign-in link is ready.</h1>
      <p style="margin:0 0 28px;font-size:14px;color:${K.muted};line-height:1.7;">
        Click below to sign in to your YN Finance developer dashboard. Manage API keys, track usage, and upgrade your plan.
      </p>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${magicLink}" style="display:inline-block;background:linear-gradient(135deg,#3b8eea,#a855f7);color:#fff;font-weight:800;font-size:14px;padding:15px 40px;border-radius:8px;text-decoration:none;">Sign In to Dashboard &rarr;</a>
      </div>
      <p style="margin:0 0 6px;font-size:12px;color:#1a3040;">&#9201; This link expires in <strong style="color:#2a4050;">60 minutes</strong> and can only be used once.</p>
      <p style="margin:0;font-size:12px;color:#1a3040;">If you did not request this, ignore this email.</p>
    </td></tr>
  `)

  try {
    await resend.emails.send({
      from:    FROM,
      to:      [email],
      subject: '⚡ Sign in to YN Finance Developer Portal',
      html,
    })
    console.log('[email] magic link sent to', email)
  } catch (err) {
    console.error('[email] magic link failed:', err)
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  DEVELOPER API — KEY CLAIMED EMAIL
// ════════════════════════════════════════════════════════════════════════════
export async function sendApiKeyClaimedEmail(email: string, keyPrefix: string, tier: string) {
  if (!RESEND_OK || !email) return

  const tierClr = tier === 'pro' ? '#3b8eea' : '#00d4aa'
  const limit   = tier === 'pro' ? '10,000' : '100'

  const html = wrap(`
    <tr><td style="background:${K.surface};border:1px solid #00d4aa20;border-radius:12px;padding:36px 32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:#00d4aa10;border:1px solid #00d4aa30;border-radius:100px;padding:5px 14px;margin-bottom:24px;">
        <span style="font-size:11px;font-weight:700;color:#00d4aa;letter-spacing:.1em;">&#128273; API KEY ACTIVATED</span>
      </div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:${K.text};line-height:1.2;letter-spacing:-.5px;">Your API key is live.</h1>
      <p style="margin:0 0 24px;font-size:14px;color:${K.muted};line-height:1.7;">
        You now have access to congressional trade data, smart money signals, earnings forensics, and AI trade analysis.
      </p>
      <div style="background:#0a1825;border:1px solid ${K.border};border-radius:10px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid ${K.border};font-size:12px;color:${K.muted};">Key prefix</td>
            <td style="padding:8px 0;border-bottom:1px solid ${K.border};text-align:right;font-family:monospace;font-size:12px;color:#00d4aa;">${keyPrefix}&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid ${K.border};font-size:12px;color:${K.muted};">Tier</td>
            <td style="padding:8px 0;border-bottom:1px solid ${K.border};text-align:right;font-family:monospace;font-size:12px;font-weight:800;color:${tierClr};">${tier.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:12px;color:${K.muted};">Monthly calls</td>
            <td style="padding:8px 0;text-align:right;font-family:monospace;font-size:12px;color:${K.text};">${limit} / month</td>
          </tr>
        </table>
      </div>
      <div style="background:#050e17;border:1px solid ${K.border};border-radius:8px;padding:14px;margin-bottom:24px;">
        <pre style="margin:0;font-family:monospace;font-size:11px;color:#6a9aaa;white-space:pre-wrap;">curl "https://ynfinance.org/api/v1/congress/trades" \\
  -H "Authorization: Bearer YOUR_FULL_KEY"</pre>
      </div>
      <div style="text-align:center;margin-bottom:16px;">${ctaBtn('Open Developer Dashboard &rarr;', BASE_URL + '/developers')}</div>
      <p style="margin:0;font-size:11px;color:#1a3040;">
        &#128274; Your full key was shown once on the dashboard and is not stored in plaintext. If lost, generate a new one from the dashboard.
      </p>
    </td></tr>
  `)

  try {
    await resend.emails.send({
      from:    FROM,
      to:      [email],
      subject: '🔑 Your YN Finance API key is ready',
      html,
    })
    console.log('[email] api key claimed sent to', email)
  } catch (err) {
    console.error('[email] api key claimed failed:', err)
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  DEVELOPER API — PRO UPGRADE CONFIRMATION
// ════════════════════════════════════════════════════════════════════════════
export async function sendApiProUpgradedEmail(email: string, keyPrefix: string) {
  if (!RESEND_OK || !email) return

  const html = wrap(`
    <tr><td style="background:${K.surface};border:1px solid #3b8eea20;border-radius:12px;padding:36px 32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:#3b8eea10;border:1px solid #3b8eea30;border-radius:100px;padding:5px 14px;margin-bottom:24px;">
        <span style="font-size:11px;font-weight:700;color:#3b8eea;letter-spacing:.1em;">&#128640; API PRO ACTIVATED</span>
      </div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:${K.text};line-height:1.2;letter-spacing:-.5px;">You&apos;re on Pro. Build without limits.</h1>
      <p style="margin:0 0 24px;font-size:14px;color:${K.muted};line-height:1.7;">
        Your YN Finance API key has been upgraded to Pro. 10,000 calls per month, all endpoints, and priority support &mdash; starting now.
      </p>
      <div style="background:#0a1825;border:1px solid ${K.border};border-radius:10px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid ${K.border};font-size:12px;color:${K.muted};">Key prefix</td>
            <td style="padding:8px 0;border-bottom:1px solid ${K.border};text-align:right;font-family:monospace;font-size:12px;color:#3b8eea;">${keyPrefix}&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid ${K.border};font-size:12px;color:${K.muted};">Tier</td>
            <td style="padding:8px 0;border-bottom:1px solid ${K.border};text-align:right;font-family:monospace;font-size:12px;font-weight:800;color:#3b8eea;">PRO &#10003;</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid ${K.border};font-size:12px;color:${K.muted};">Monthly calls</td>
            <td style="padding:8px 0;border-bottom:1px solid ${K.border};text-align:right;font-family:monospace;font-size:12px;color:${K.text};">10,000 / month</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid ${K.border};font-size:12px;color:${K.muted};">Rate limit</td>
            <td style="padding:8px 0;border-bottom:1px solid ${K.border};text-align:right;font-family:monospace;font-size:12px;color:${K.text};">60 req / min</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:12px;color:${K.muted};">Billing</td>
            <td style="padding:8px 0;text-align:right;font-size:12px;color:${K.text};">$49/month &middot; Cancel anytime</td>
          </tr>
        </table>
      </div>
      <div style="text-align:center;margin-bottom:16px;">${ctaBtn('Open Developer Dashboard &rarr;', BASE_URL + '/developers')}</div>
      <p style="margin:0;font-size:12px;color:#1a3040;text-align:center;">
        Manage or cancel: <a href="mailto:api@ynfinance.org?subject=Manage+Pro" style="color:#2a4060;">api@ynfinance.org</a>
      </p>
    </td></tr>
  `)

  try {
    await resend.emails.send({
      from:    FROM,
      to:      [email],
      subject: '🚀 YN Finance API Pro — you\'re in',
      html,
    })
    console.log('[email] api pro upgraded sent to', email)
  } catch (err) {
    console.error('[email] api pro upgraded failed:', err)
  }
}
