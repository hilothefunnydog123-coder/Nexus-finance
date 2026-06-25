'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { bindGlobal, pageEnter } from './siteBrainClient'

/**
 * Mounts the Site Brain tracker globally. Records a pageview + dwell + scroll
 * per route and binds delegated click/ticker capture. Cookieless, opt-out aware,
 * fail-silent. Pair with <WhatItLearned /> for the transparency panel.
 */
export default function SiteBrainProvider() {
  const path = usePathname()
  useEffect(() => { bindGlobal() }, [])
  useEffect(() => { if (path) pageEnter(path) }, [path])
  return null
}
