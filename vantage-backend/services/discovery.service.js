const axios  = require('axios');
const logger = require('../config/logger');

const PLATFORM_OPERATORS = {
  'telegram.org':  'Telegram',
  't.me':          'Telegram',
  'mega.nz':       'MEGA Cloud',
  'archive.org':   'Internet Archive',
  'reddit.com':    'Reddit',
  'twitter.com':   'X / Twitter',
  'x.com':         'X / Twitter',
  'tiktok.com':    'TikTok',
  'youtube.com':   'YouTube',
  'bunkr.si':      'Bunkrr',
  'bunkrr.su':     'Bunkrr',
  'fapello.com':   'Fapello',
  'kemono.su':     'Kemono',
  'coomer.su':     'Coomer',
  'simpcity.su':   'SimpCity',
  'erome.com':     'Erome',
  'cyberdrop.me':  'Cyberdrop',
  'gofile.io':     'GoFile',
  'pixeldrain.com':'Pixeldrain',
};

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return PLATFORM_OPERATORS[host] || host;
  } catch {
    return 'Unknown';
  }
}

const PLATFORM_GROUPS = [
  `site:t.me OR site:mega.nz OR site:archive.org OR site:reddit.com OR site:twitter.com`,
  `site:bunkr.si OR site:bunkrr.su OR site:fapello.com OR site:kemono.su OR site:coomer.su`,
  `site:simpcity.su OR site:erome.com OR site:cyberdrop.me OR site:gofile.io OR site:pixeldrain.com`,
];

async function serperSearch(apiKey, query, page = 0) {
  const response = await axios.post(
    'https://google.serper.dev/search',
    { q: query, num: 10, page, gl: 'us', hl: 'en' },
    {
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      timeout: 10000
    }
  );
  return response.data?.organic || [];
}

async function runDiscoveryScan(query) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    logger.warn('SERPER_API_KEY not set — returning empty results');
    return [];
  }

  const seen = new Set();
  const results = [];
  const MAX_PAGES = 5;

  await Promise.all(PLATFORM_GROUPS.map(async (sites) => {
    for (let page = 0; page < MAX_PAGES; page++) {
      try {
        const organic = await serperSearch(apiKey, `"${query}" ${sites}`, page);
        if (organic.length === 0) break;

        organic.forEach(r => {
          if (!seen.has(r.link)) {
            seen.add(r.link);
            results.push({
              url:      r.link,
              title:    r.title   || '',
              snippet:  r.snippet || '',
              platform: detectPlatform(r.link)
            });
          }
        });

        if (organic.length < 10) break; // last page
      } catch (err) {
        logger.warn(`Serper query failed p${page}: ${err.message}`);
        break;
      }
    }
  }));

  logger.info(`Discovery scan for "${query}" returned ${results.length} results`);
  return results;
}

module.exports = { runDiscoveryScan };
