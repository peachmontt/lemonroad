import type { VercelRequest, VercelResponse } from '@vercel/node';

const SITE = 'https://www.lemonroad.xyz';

const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [
  { loc: `${SITE}/`,                 lastmod: '2026-05-21', changefreq: 'daily',   priority: '1.0' },
  { loc: `${SITE}/how-to-play`,      lastmod: '2026-05-21', changefreq: 'monthly', priority: '0.8' },
  { loc: `${SITE}/daily-rewards`,    lastmod: '2026-05-21', changefreq: 'weekly',  priority: '0.8' },
  { loc: `${SITE}/leaderboard`,      lastmod: '2026-05-21', changefreq: 'daily',   priority: '0.8' },
  { loc: `${SITE}/play-to-burn`,     lastmod: '2026-05-21', changefreq: 'monthly', priority: '0.8' },
  { loc: `${SITE}/free-browser-game`,lastmod: '2026-05-21', changefreq: 'monthly', priority: '0.8' },
  { loc: `${SITE}/faq`,              lastmod: '2026-05-21', changefreq: 'monthly', priority: '0.6' },
  { loc: `${SITE}/about`,            lastmod: '2026-05-21', changefreq: 'monthly', priority: '0.6' },
  { loc: `${SITE}/press`,            lastmod: '2026-05-21', changefreq: 'monthly', priority: '0.6' },
  { loc: `${SITE}/reward-rules`,     lastmod: '2026-05-21', changefreq: 'monthly', priority: '0.6' },
  { loc: `${SITE}/fair-play`,        lastmod: '2026-05-21', changefreq: 'monthly', priority: '0.6' },
  { loc: `${SITE}/terms`,            lastmod: '2026-05-21', changefreq: 'yearly',  priority: '0.4' },
  { loc: `${SITE}/privacy`,          lastmod: '2026-05-21', changefreq: 'yearly',  priority: '0.4' },
];

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    ),
    '</urlset>',
  ].join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
  res.status(200).send(body);
}
