import { MetadataRoute } from 'next'

const base = 'https://ynfinance.org'
const now  = new Date()

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // Core — highest priority
    { url: base,                        lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/app`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/arena`,             lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/intelligence`,      lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/agents`,            lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/courses`,           lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/ai-stocks`,         lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${base}/analyzer`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },

    // Daily Intel
    { url: `${base}/daily`,             lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${base}/daily/subscribe`,   lastModified: now, changeFrequency: 'monthly', priority: 0.5 },

    // Arena sub-pages
    { url: `${base}/arena/how-it-works`,lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/arena/schedule`,    lastModified: now, changeFrequency: 'daily',   priority: 0.6 },
    { url: `${base}/arena/discover`,    lastModified: now, changeFrequency: 'daily',   priority: 0.6 },
    { url: `${base}/arena/creator`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.5 },

    // Intelligence / Research
    { url: `${base}/intel`,             lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${base}/earnings`,          lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${base}/congress`,          lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${base}/research`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${base}/performance`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },

    // Company
    { url: `${base}/company`,           lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/careers`,           lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/press`,             lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/investors`,         lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/developers`,        lastModified: now, changeFrequency: 'monthly', priority: 0.5 },

    // Quiz
    { url: `${base}/quiz`,              lastModified: now, changeFrequency: 'monthly', priority: 0.5 },

    // Legal
    { url: `${base}/privacy`,           lastModified: now, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${base}/terms`,             lastModified: now, changeFrequency: 'monthly', priority: 0.2 },
  ]
}
