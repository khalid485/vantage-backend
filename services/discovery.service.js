const axios  = require('axios');
const logger = require('../config/logger');

// Compliant public index sources only — no NCII aggregators
const PLATFORM_OPERATORS = {
  'telegram.org':  'Telegram (t.me)',
  'mega.nz':       'MEGA Cloud',
  'archive.org':   'Internet Archive',
  'reddit.com':    'Reddit',
  'twitter.com':   'X / Twitter',
  'x.com':         'X / Twitter',
  'tiktok.com':    'TikTok',
  'youtube.com':   'YouTube',
};

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return PLATFORM_OPERATORS[host] || host;
  } catch {
    return 'Unknown';
  }
}

/**
 * Run a Serper (Google Search API) discovery scan.
 * Returns array of { url, title, snippet, platform }.
 */
async function runDiscoveryScan(query) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    logger.warn('SERPER_API_KEY not set — returning empty results');
    return [];
  }

  // Build a site-scoped query targeting compliant platforms
  const scopedQuery = `${query} site:t.me OR site:mega.nz OR site:archive.org OR site:reddit.com OR site:twitter.com`;

  const response = await axios.post(
    'https://google.serper.dev/search',
    { q: scopedQuery, num: 20 },
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
    title:    r.title    || '',
    snippet:  r.snippet  || '',
    platform: detectPlatform(r.link)
  }));
}

module.exports = { runDiscoveryScan };
