const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #040c14;
  color: #cdd6f4;
  padding: 0;
  margin: 0;
`

const CONTAINER = `
  max-width: 560px;
  margin: 0 auto;
  padding: 40px 24px;
`

const HEADER = `
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #1a2d4a;
`

function badge(text: string, color: string) {
  return `<span style="display:inline-block;padding:4px 12px;background:${color}20;color:${color};border:1px solid ${color}40;border-radius:4px;font-size:11px;font-family:monospace;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">${text}</span>`
}

function statRow(label: string, value: string, valueColor = '#cdd6f4') {
  return `
    <tr>
      <td style="padding:8px 0;color:#7f93b5;font-size:12px;">${label}</td>
      <td style="padding:8px 0;text-align:right;color:${valueColor};font-family:monospace;font-size:12px;font-weight:700;">${value}</td>
    </tr>
  `
}

export function challengeStartedEmail({
  username, email, tier, accountSize, profitTarget, maxDrawdown, dailyLoss, maxDays,
}: {
  username: string; email: string; tier: string; accountSize: number;
  profitTarget: number; maxDrawdown: number; dailyLoss: number; maxDays: number;
}) {
  const tierColor = tier === 'elite' ? '#ffa502' : tier === 'pro' ? '#00d4aa' : '#7f93b5'
  return {
    subject: `🚀 Your YN Capital ${tier.charAt(0).toUpperCase() + tier.slice(1)} Challenge Has Begun`,
    html: `
<!DOCTYPE html>
<html><body style="${BASE_STYLE}">
<div style="${CONTAINER}">
  <div style="${HEADER}">
    <div style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#fff;margin-bottom:6px;">
      YN <span style="color:#00d4aa;font-weight:300;letter-spacing:3px;">CAPITAL</span>
    </div>
    ${badge('Challenge Started', tierColor)}
  </div>

  <p style="font-size:14px;color:#7f93b5;margin-bottom:24px;">
    Hey <strong style="color:#cdd6f4">${username}</strong> — your <strong style="color:${tierColor}">${tier.toUpperCase()}</strong> challenge is now active.
    The clock is ticking. Trade with discipline and prove your edge.
  </p>

  <div style="background:#071220;border:1px solid #1a2d4a;border-radius:8px;padding:20px;margin-bottom:24px;">
    <div style="font-size:11px;color:#4a5e7a;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">Challenge Parameters</div>
    <table style="width:100%;border-collapse:collapse;">
      ${statRow('Account Size',     `$${accountSize.toLocaleString()}`, '#cdd6f4')}
      ${statRow('Profit Target',    `${profitTarget}% ($${(accountSize * profitTarget / 100).toLocaleString()})`, '#00d4aa')}
      ${statRow('Max Drawdown',     `${maxDrawdown}%`, '#ff4757')}
      ${statRow('Daily Loss Limit', `${dailyLoss}%`, '#ff4757')}
      ${statRow('Time Limit',       `${maxDays} days`, '#ffa502')}
    </table>
  </div>

  <div style="background:#071220;border:1px solid #1a2d4a;border-radius:8px;padding:20px;margin-bottom:32px;">
    <div style="font-size:11px;color:#4a5e7a;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">Key Rules</div>
    <ul style="margin:0;padding-left:16px;color:#7f93b5;font-size:12px;line-height:2;">
      <li>Do not exceed the maximum drawdown at any point</li>
      <li>Daily loss limit resets at midnight ET</li>
      <li>Hit your profit target before the time limit expires</li>
      <li>All trades are tracked on the YN Finance platform</li>
    </ul>
  </div>

  <div style="text-align:center;">
    <a href="https://ynfinance.org" style="display:inline-block;padding:14px 32px;background:#00d4aa;color:#040c14;font-weight:900;text-decoration:none;border-radius:6px;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">
      Open Trading Terminal →
    </a>
  </div>

  <p style="margin-top:32px;font-size:11px;color:#4a5e7a;text-align:center;border-top:1px solid #1a2d4a;padding-top:24px;">
    YN Capital Prop Firm Simulation · <a href="https://ynfinance.org" style="color:#00d4aa;text-decoration:none;">ynfinance.org</a><br>
    This is a simulated trading environment. No real funds are at risk.
  </p>
</div>
</body></html>`,
  }
}

export function challengePassedEmail({
  username, tier, accountSize, finalPnLPct, tradingDays,
}: {
  username: string; tier: string; accountSize: number; finalPnLPct: number; tradingDays: number;
}) {
  const profit = (accountSize * finalPnLPct / 100).toFixed(2)
  const tierColor = tier === 'elite' ? '#ffa502' : tier === 'pro' ? '#00d4aa' : '#7f93b5'
  return {
    subject: `🏆 CONGRATULATIONS — You Passed the YN Capital ${tier.toUpperCase()} Challenge`,
    html: `
<!DOCTYPE html>
<html><body style="${BASE_STYLE}">
<div style="${CONTAINER}">
  <div style="${HEADER}">
    <div style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#fff;margin-bottom:6px;">
      YN <span style="color:#00d4aa;font-weight:300;letter-spacing:3px;">CAPITAL</span>
    </div>
    ${badge('Challenge Passed ✓', '#00d4aa')}
  </div>

  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:64px;margin-bottom:8px;">🏆</div>
    <h1 style="font-size:24px;font-weight:900;color:#fff;margin:0 0 8px;">You Did It, ${username}!</h1>
    <p style="color:#7f93b5;font-size:14px;margin:0;">You have successfully passed the YN Capital ${tier.charAt(0).toUpperCase() + tier.slice(1)} Challenge.</p>
  </div>

  <div style="background:#00d4aa10;border:1px solid #00d4aa40;border-radius:8px;padding:20px;margin-bottom:24px;">
    <div style="font-size:11px;color:#4a5e7a;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">Final Performance</div>
    <table style="width:100%;border-collapse:collapse;">
      ${statRow('Final P&L',        `+${finalPnLPct.toFixed(2)}% (+$${profit})`, '#00d4aa')}
      ${statRow('Account Size',     `$${accountSize.toLocaleString()}`, '#cdd6f4')}
      ${statRow('Trading Days',     String(tradingDays), '#cdd6f4')}
      ${statRow('Challenge Tier',   tier.toUpperCase(), tierColor)}
      ${statRow('Status',           'PASSED ✓', '#00d4aa')}
    </table>
  </div>

  <div style="background:#071220;border:1px solid #1a2d4a;border-radius:8px;padding:20px;margin-bottom:32px;">
    <div style="font-size:12px;font-weight:700;color:#cdd6f4;margin-bottom:8px;">Next Steps</div>
    <ol style="margin:0;padding-left:16px;color:#7f93b5;font-size:12px;line-height:2.2;">
      <li>Log in to your YN Finance account</li>
      <li>Go to Community → YN Capital</li>
      <li>Click <strong style="color:#00d4aa">"Request Simulated Payout"</strong></li>
      <li>Your achievement will appear on the Funded Trader Board</li>
    </ol>
  </div>

  <div style="text-align:center;">
    <a href="https://ynfinance.org" style="display:inline-block;padding:14px 32px;background:#00d4aa;color:#040c14;font-weight:900;text-decoration:none;border-radius:6px;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">
      Claim Your Achievement →
    </a>
  </div>

  <p style="margin-top:32px;font-size:11px;color:#4a5e7a;text-align:center;border-top:1px solid #1a2d4a;padding-top:24px;">
    YN Capital Prop Firm Simulation · <a href="https://ynfinance.org" style="color:#00d4aa;text-decoration:none;">ynfinance.org</a>
  </p>
</div>
</body></html>`,
  }
}

export function payoutRequestEmail({
  username, email, tier, accountSize, finalPnLPct,
}: {
  username: string; email: string; tier: string; accountSize: number; finalPnLPct: number;
}) {
  const profit = (accountSize * finalPnLPct / 100).toFixed(2)
  return {
    subject: `💰 Payout Request Received — YN Capital`,
    html: `
<!DOCTYPE html>
<html><body style="${BASE_STYLE}">
<div style="${CONTAINER}">
  <div style="${HEADER}">
    <div style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#fff;margin-bottom:6px;">
      YN <span style="color:#00d4aa;font-weight:300;letter-spacing:3px;">CAPITAL</span>
    </div>
    ${badge('Payout Request Received', '#ffa502')}
  </div>

  <p style="font-size:14px;color:#7f93b5;margin-bottom:24px;">
    Hey <strong style="color:#cdd6f4">${username}</strong> — we've received your payout request for the completed YN Capital challenge.
  </p>

  <div style="background:#ffa50210;border:1px solid #ffa50240;border-radius:8px;padding:20px;margin-bottom:24px;">
    <div style="font-size:11px;color:#4a5e7a;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">Payout Summary</div>
    <table style="width:100%;border-collapse:collapse;">
      ${statRow('Username',       username, '#cdd6f4')}
      ${statRow('Email',          email, '#7f93b5')}
      ${statRow('Tier',           tier.toUpperCase(), '#ffa502')}
      ${statRow('Account Size',   `$${accountSize.toLocaleString()}`, '#cdd6f4')}
      ${statRow('Final P&L',      `+${finalPnLPct.toFixed(2)}%`, '#00d4aa')}
      ${statRow('Payout Amount',  `$${profit} (simulated)`, '#00d4aa')}
      ${statRow('Status',         'Under Review', '#ffa502')}
    </table>
  </div>

  <div style="background:#071220;border:1px solid #1a2d4a;border-radius:8px;padding:16px;margin-bottom:32px;font-size:11px;color:#7f93b5;line-height:1.8;">
    ⚠️ <strong style="color:#ffa502">This is a simulated trading platform.</strong> YN Finance is a portfolio project and does not process real payouts.
    This achievement demonstrates your trading discipline and consistency using paper trading — a valuable credential for your trading portfolio.
  </div>

  <div style="text-align:center;">
    <a href="https://ynfinance.org" style="display:inline-block;padding:14px 32px;background:#ffa502;color:#040c14;font-weight:900;text-decoration:none;border-radius:6px;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">
      View Your Dashboard →
    </a>
  </div>

  <p style="margin-top:32px;font-size:11px;color:#4a5e7a;text-align:center;border-top:1px solid #1a2d4a;padding-top:24px;">
    YN Capital Prop Firm Simulation · <a href="https://ynfinance.org" style="color:#00d4aa;text-decoration:none;">ynfinance.org</a>
  </p>
</div>
</body></html>`,
  }
}
