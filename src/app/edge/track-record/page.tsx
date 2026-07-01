import type { Metadata } from 'next'
import { DeskShell } from '@/components/cinematic/Desk'
import { GREEN } from '@/components/edge/shared'
import TrackRecordClient from '@/components/edge/TrackRecordClient'

export const metadata: Metadata = {
  title: 'YnKalshi — Portfolio & Track Record',
  description:
    "The BrainStock net's live Kalshi portfolio: an equity curve of every pick we flagged worth it, plus the public report card — Brier score, calibration curve, hit rate, and realized ROI. Un-cherry-picked.",
}

export default function EdgeTrackRecordPage() {
  return (
    <DeskShell title="YnKalshi · portfolio & track record" accent={GREEN} back="/edge">
      <TrackRecordClient />
    </DeskShell>
  )
}
