import type { Metadata } from 'next'
import SpecClient from './SpecClient'

export const metadata: Metadata = {
  title: 'PROJECT MATRIX // NATIVE — Engineering Specification | YN Finance',
  description:
    'The full engineering blueprint for the MATRIX native trading client: Rust/wgpu architecture, the bio-mechanical Neural Core, the Hyper-Stream ledger, and the millisecond execution protocol.',
}

export default function Page() {
  return <SpecClient />
}
