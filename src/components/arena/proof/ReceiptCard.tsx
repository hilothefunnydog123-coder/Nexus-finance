'use client'

import { Hash } from './Hash'
import { CheckRow, boolState } from './CheckRow'
import { MerklePath } from './MerklePath'
import { VerdictBanner, decideVerdict } from './VerdictBanner'
import { C, type VerifyCallResponse, type VerifyDayResponse } from './types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono),monospace',
          fontSize: 11,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: C.faint,
          padding: '10px 14px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {title}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  )
}

function KV({ k, v, color }: { k: string; v: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '6px 0', flexWrap: 'wrap' }}>
      <span style={{ color: C.faint, fontSize: 13 }}>{k}</span>
      <span style={{ color: color ?? C.txt, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{v}</span>
    </div>
  )
}

function RootCompare({
  stored,
  recomputed,
  intact,
}: {
  stored?: string
  recomputed?: string
  intact?: boolean
}) {
  const match = intact !== false
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ width: 96, color: C.faint, fontSize: 12 }}>stored root</span>
        <Hash value={stored} color={match ? C.green : C.amber} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ width: 96, color: C.faint, fontSize: 12 }}>recomputed</span>
        <Hash value={recomputed} color={match ? C.green : C.redHard} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: match ? C.green : C.redHard }}>
        {match
          ? '✓ The root rebuilt from every stored call equals the sealed root.'
          : '✗ The rebuilt root differs from the sealed root — the leaf set changed.'}
      </div>
    </div>
  )
}

function CountLine({ stored, actual }: { stored?: number; actual?: number }) {
  const match = stored === actual
  return (
    <KV
      k="leaf count (stored vs actual)"
      color={match ? C.green : C.redHard}
      v={
        <>
          {stored ?? '—'} / {actual ?? '—'} {match ? '✓' : '✗ a call was added or removed'}
        </>
      }
    />
  )
}

// ── Single-call receipt ────────────────────────────────────────────────────
export function CallReceiptCard({ data }: { data: VerifyCallResponse }) {
  const r = data.receipt
  const call = data.call
  if (!r || !call) return null

  const verdict = decideVerdict({
    tamper: data.tamper_detected,
    signed: data.signed,
    rootSigValid: r.root_sig_valid,
  })

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <VerdictBanner verdict={verdict} />

      <Section title={`the sealed call · ${call.ticker} · ${call.trade_date}`}>
        <KV k="ticker" v={call.ticker} color={C.cyan} />
        <KV
          k="direction"
          v={call.direction === 'up' ? '▲ UP' : '▼ DOWN'}
          color={call.direction === 'up' ? C.green : C.red}
        />
        <KV k="start price" v={fmt(call.start_price)} />
        <KV k="target" v={fmt(call.target)} />
        <KV k="horizon" v={`${call.horizon} sessions`} />
        <KV k="resolves" v={call.resolve_date} />
        <KV k="sealed at" v={fmtTime(call.sealed_at)} color={C.violet} />
        {call.status && <KV k="status" v={call.status} />}
      </Section>

      <Section title="integrity checks · what each line proves">
        <CheckRow
          label="Leaf intact"
          state={boolState(r.leaf_intact)}
          proves="A fresh SHA-256 of this call's exact fields equals the leaf hash stored at sealing. If any field (price, target, direction, time) were edited, this fails."
        />
        <CheckRow
          label="Included in root"
          state={boolState(r.included_in_root)}
          proves="Climbing the Merkle path from this leaf reproduces the day's root — proving the call was one of the leaves committed before the outcome was known."
        />
        <CheckRow
          label="Root intact"
          state={boolState(r.root_intact)}
          proves="The root rebuilt from all of today's stored calls matches the stored root — no call was silently added, removed, or swapped."
        />
        <CheckRow
          label="Root signature"
          state={boolState(r.root_sig_valid)}
          proves={
            r.root_sig_valid === null
              ? 'No HMAC signature is attached to this root — hashes prove integrity, but not that we authored it (hash-only mode).'
              : 'The HMAC signature over the root verifies against the provenance key — confirming we, and only we, sealed this exact root.'
          }
        />
        <div style={{ borderBottom: 'none' }}>
          <CheckRow
            label="Chain intact"
            state={boolState(r.chain_intact)}
            proves="This day's root is hash-chained to the previous sealed day. Backdating or re-sealing a past day breaks every link after it."
          />
        </div>
      </Section>

      <Section title="canonical string (exactly what was hashed)">
        <Hash value={r.canonical} full color={C.txt} />
        <p style={{ color: C.faint, fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
          This deterministic string is the input to SHA-256. Re-hash it yourself and you get the leaf below.
        </p>
      </Section>

      <Section title="leaf hash · stored vs recomputed">
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ width: 96, color: C.faint, fontSize: 12 }}>stored leaf</span>
            <Hash value={r.stored_leaf} color={r.leaf_intact ? C.green : C.amber} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ width: 96, color: C.faint, fontSize: 12 }}>expected</span>
            <Hash value={r.expected_leaf} color={r.leaf_intact ? C.green : C.redHard} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: r.leaf_intact ? C.green : C.redHard }}>
            {r.leaf_intact ? '✓ Stored leaf matches a fresh hash of the call.' : '✗ Mismatch — the call’s fields were altered after sealing.'}
          </div>
        </div>
      </Section>

      <Section title="merkle inclusion path → root">
        <MerklePath
          leaf={r.stored_leaf}
          steps={r.merkle_proof}
          root={r.stored_root}
          included={r.included_in_root}
        />
      </Section>

      <Section title="day root · rebuilt from every call">
        <RootCompare stored={r.stored_root} recomputed={r.recomputed_root} intact={r.root_intact} />
        <div style={{ marginTop: 10 }}>
          <CountLine stored={r.leaf_count_stored} actual={r.leaf_count_actual} />
        </div>
      </Section>

      <ProvenanceSection
        algorithm={r.algorithm}
        anchor={r.anchor_ref}
        sigValid={r.root_sig_valid}
        chainIntact={r.chain_intact}
      />
    </div>
  )
}

// ── Whole-day receipt ──────────────────────────────────────────────────────
export function DayReceiptCard({ data }: { data: VerifyDayResponse }) {
  const s = data.seal
  if (!s) return null

  const verdict = decideVerdict({
    tamper: data.tamper_detected,
    signed: data.signed,
    rootSigValid: s.root_sig_valid,
  })

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <VerdictBanner verdict={verdict} />

      <Section title={`day-level verdict · ${s.trade_date}`}>
        <CheckRow
          label="Root intact"
          state={boolState(s.root_intact)}
          proves="The root recomputed from every stored call this day equals the sealed root — the full leaf set is unchanged."
        />
        <CheckRow
          label="Count matches"
          state={boolState(data.count_matches)}
          proves="The number of stored calls equals the leaf count recorded at sealing — no call was added or deleted."
        />
        <CheckRow
          label="Root signature"
          state={boolState(s.root_sig_valid)}
          proves={
            s.root_sig_valid === null
              ? 'No HMAC signature attached — integrity is provable, authorship is not (hash-only mode).'
              : 'The HMAC over the root verifies against the provenance key.'
          }
        />
        <div>
          <CheckRow
            label="Chain intact"
            state={boolState(s.chain_intact)}
            proves="This day chains to the previous sealed day; tampering with any earlier day breaks the chain forward from it."
          />
        </div>
      </Section>

      <Section title="day root · rebuilt from every call">
        <RootCompare stored={s.stored_root} recomputed={s.recomputed_root} intact={s.root_intact} />
        <div style={{ marginTop: 10 }}>
          <CountLine stored={s.leaf_count_stored} actual={s.leaf_count_actual} />
        </div>
      </Section>

      <ProvenanceSection
        algorithm={s.algorithm}
        anchor={s.anchor_ref}
        sigValid={s.root_sig_valid}
        chainIntact={s.chain_intact}
      />
    </div>
  )
}

function ProvenanceSection({
  algorithm,
  anchor,
  sigValid,
  chainIntact,
}: {
  algorithm?: string
  anchor?: string | null
  sigValid?: boolean | null
  chainIntact?: boolean
}) {
  return (
    <Section title="provenance">
      <KV k="algorithm" v={algorithm || '—'} color={C.cyan} />
      <KV
        k="signature"
        v={sigValid === null ? 'unsigned (hash-only)' : sigValid ? 'valid ✓' : 'INVALID ✗'}
        color={sigValid === null ? C.amber : sigValid ? C.green : C.redHard}
      />
      <KV
        k="hash chain"
        v={chainIntact ? 'linked ✓' : 'broken ✗'}
        color={chainIntact ? C.green : C.redHard}
      />
      <KV
        k="external anchor"
        v={anchor ? <Hash value={anchor} color={C.violet} /> : 'not externally anchored yet'}
        color={anchor ? undefined : C.faint}
      />
    </Section>
  )
}

function fmt(n?: number) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toISOString().replace('T', ' ').replace('.000Z', ' UTC').replace('Z', ' UTC')
}
