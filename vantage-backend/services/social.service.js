const axios = require('axios');
const logger = require('../config/logger');

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE  = 'https://api.apify.com/v2';

async function runActor(actorId, input) {
  const run = await axios.post(
    `${APIFY_BASE}/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
    input,
    { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
  );
  const runId = run.data.data.id;

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const status = await axios.get(
      `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const st = status.data.data.status;
    if (st === 'SUCCEEDED') break;
    if (st === 'FAILED' || st === 'ABORTED') throw new Error(`Actor ${actorId} ${st}`);
  }

  const dataset = await axios.get(
    `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`
  );
  return dataset.data || [];
}

async function scanInstagram(query) {
  try {
    const results = await runActor('apify/instagram-scraper', {
      search: query,
      searchType: 'hashtag',
      resultsLimit: 20,
    });
    return results.map(r => ({
      url:      r.url || `https://instagram.com/p/${r.shortCode}`,
      platform: 'Instagram',
      title:    r.caption?.slice(0, 80) || 'Instagram post',
      snippet:  `${r.likesCount || 0} likes · ${r.commentsCount || 0} comments`,
      label:    'Instagram',
      tier:     'Social',
    }));
  } catch (err) {
    logger.warn('Instagram scrape failed:', err.message);
    return [];
  }
}

async function scanTikTok(query) {
  try {
    const results = await runActor('clockworks/tiktok-scraper', {
      searchQueries: [query],
      resultsPerPage: 20,
    });
    return results.map(r => ({
      url:      r.webVideoUrl || `https://tiktok.com/@${r.authorMeta?.name}`,
      platform: 'TikTok',
      title:    r.text?.slice(0, 80) || 'TikTok video',
      snippet:  `${r.diggCount || 0} likes · ${r.playCount || 0} views`,
      label:    'TikTok',
      tier:     'Social',
    }));
  } catch (err) {
    logger.warn('TikTok scrape failed:', err.message);
    return [];
  }
}

async function runSocialScan(query) {
  if (!APIFY_TOKEN) {
    logger.warn('APIFY_API_TOKEN not set — skipping social scan');
    return [];
  }
  const [ig, tt] = await Promise.all([scanInstagram(query), scanTikTok(query)]);
  return [...ig, ...tt];
}

module.exports = { runSocialScan };
