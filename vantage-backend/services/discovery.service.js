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
};

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return PLATFORM_OPERATORS[host] || host;
  } catch {
    return 'Unknown';
  }
}

async function runDiscoveryScan(query) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    logger.warn('SERPER_API_KEY not set — returning empty results');
    return [];
  }

  const scopedQuery = `"${query}" site:t.me OR site:mega.nz OR site:archive.org OR site:reddit.com OR site:twitter.com OR site:bunkr.si OR site:bunkrr.su OR site:fapello.com OR site:kemono.su OR site:coomer.su OR site:simpcity.su OR site:erome.com OR site:cyberdrop.me`;

  const response = await axios.post(
    'https://google.serper.dev/search',
    { q: scopedQuery, num: 20, gl: 'us', hl: 'en' },
    {
      headers: {
        'X-API-KEY':    apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );

  const organic = response.data?.organic || [];

  return organic.map(r => ({
    url:      r.link,
    title:    r.title   || '',
    snippet:  r.snippet || '',
    platform: detectPlatform(r.link)
  }));
}

module.exports = { runDiscoveryScan };