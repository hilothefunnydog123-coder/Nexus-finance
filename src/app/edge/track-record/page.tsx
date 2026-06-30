import type { Metadata } from 'next'
import { DeskShell } from '@/components/cinematic/Desk'
import { GREEN } from '@/components/edge/shared'
import TrackRecordClient from '@/components/edge/TrackRecordClient'

export const metadata: Metadata = {
  title: 'YN Edge — Track Record',
  description:
    'We log our probability for every prediction market the moment we price it, then grade ourselves on settlement — public Brier score, calibration curve, and realized ROI of the picks we flagged worth it. Un-cherry-picked.',
}

export default function EdgeTrackRecordPage() {
  return (
    <DeskShell title="YN Edge · track record" accent={GREEN} back="/edge">
      <TrackRecordClient />
    </DeskShell>
  )
}
