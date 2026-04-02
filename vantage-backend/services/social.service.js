const axios = require('axios');
const logger = require('../config/logger');

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE  = 'https://api.apify.com/v2';

async function runActor(actorId, input) {
  // Start the run
  const run = await axios.post(
    `${APIFY_BASE}/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
    input,
    { headers: { 'Content-Type': 'application/json' }, timeout: 120000 }
  );
  const runId = run.data.data.id;

  // Poll until finished (max 90s)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const status = await axios.get(
      `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const st = status.data.data.status;
    logger.info(`[SOCIAL] Actor ${actorId} status: ${st}`);
    if (st === 'SUCCEEDED') break;
    if (st === 'FAILED' || st === 'ABORTED') throw new Error(`Actor ${actorId} ${st}`);
  }

  // Fetch results
  const dataset = await axios.get(
    `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`
  );
  return dataset.data || [];
}

async function scanInstagram(query) {
  try {
    logger.info(`[SOCIAL] Starting Instagram scan for "${query}"`);
    // Use hashtag search — no login required
    const results = await runActor('apify/instagram-search-scraper', {
      search: query,
      resultsLimit: 20,
    });
    logger.info(`[SOCIAL] Instagram returned ${results.length} results`);
    return results.map(r => ({
      url:      r.url || r.shortCode ? `https://instagram.com/p/${r.shortCode}` : '',
      platform: 'Instagram',
      title:    r.caption?.slice(0, 80) || 'Instagram post',
      snippet:  `${r.likesCount || 0} likes`,
    })).filter(r => r.url);
  } catch (err) {
    logger.warn(`[SOCIAL] Instagram scrape failed: ${err.message}`);
    return [];
  }
}

async function scanTikTok(query) {
  try {
    logger.info(`[SOCIAL] Starting TikTok scan for "${query}"`);
    const results = await runActor('clockworks/tiktok-scraper', {
      hashtags:       [query.replace(/\s+/g, '')],
      resultsPerPage: 20,
      maxResults:     20,
    });
    logger.info(`[SOCIAL] TikTok returned ${results.length} results`);
    return results.map(r => ({
      url:      r.webVideoUrl || `https://tiktok.com/@${r.authorMeta?.name}/video/${r.id}`,
      platform: 'TikTok',
      title:    r.text?.slice(0, 80) || 'TikTok video',
      snippet:  `${r.diggCount || 0} likes · ${r.playCount || 0} views`,
    })).filter(r => r.url);
  } catch (err) {
    logger.warn(`[SOCIAL] TikTok scrape failed: ${err.message}`);
    return [];
  }
}

async function runSocialScan(query) {
  if (!APIFY_TOKEN) {
    logger.warn('[SOCIAL] APIFY_API_TOKEN not set — skipping social scan');
    return [];
  }
  logger.info(`[SOCIAL] Running social scan for "${query}"`);
  const [ig, tt] = await Promise.all([scanInstagram(query), scanTikTok(query)]);
  const total = [...ig, ...tt];
  logger.info(`[SOCIAL] Total social results: ${total.length} (IG: ${ig.length}, TT: ${tt.length})`);
  return total;
}

module.exports = { runSocialScan };
