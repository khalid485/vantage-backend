const axios = require('axios');
const logger = require('../config/logger');

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE  = 'https://api.apify.com/v2';

const ACTOR_TIKTOK    = 'GdWCkxBtKWOsKjdch';  // clockworks/tiktok-scraper ✅ working
const ACTOR_INSTAGRAM = 'cHEjMoZJBi3pnNnMK';  // apify/instagram-hashtag-scraper

async function runActor(actorId, input) {
  logger.info(`[SOCIAL] Starting actor ${actorId}`);
  const run = await axios.post(
    `${APIFY_BASE}/acts/${actorId}/runs?token=${APIFY_TOKEN}&timeout=90`,
    input,
    { headers: { 'Content-Type': 'application/json' }, timeout: 120000 }
  );
  const runId = run.data.data.id;
  logger.info(`[SOCIAL] Actor ${actorId} run started: ${runId}`);

  for (let i = 0; i < 18; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await axios.get(
      `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const st = statusRes.data.data.status;
    logger.info(`[SOCIAL] Actor ${actorId} status: ${st} (attempt ${i + 1})`);
    if (st === 'SUCCEEDED') break;
    if (['FAILED','ABORTED','TIMED-OUT'].includes(st)) throw new Error(`Actor ${actorId} ended: ${st}`);
  }

  const dataset = await axios.get(
    `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`
  );
  const items = dataset.data || [];
  logger.info(`[SOCIAL] Actor ${actorId} returned ${items.length} items`);
  return items;
}

async function scanTikTok(query) {
  try {
    const hashtag = query.replace(/\s+/g, '').toLowerCase();
    logger.info(`[SOCIAL] TikTok scan for hashtag: ${hashtag}`);
    const results = await runActor(ACTOR_TIKTOK, {
      hashtags:                [hashtag],
      resultsPerPage:          10,
      maxResults:              10,
      shouldDownloadVideos:    false,
      shouldDownloadCovers:    false,
      shouldDownloadSubtitles: false,
    });
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

async function scanInstagram(query) {
  try {
    const hashtag = query.replace(/\s+/g, '').toLowerCase();
    logger.info(`[SOCIAL] Instagram scan for hashtag: ${hashtag}`);
    const results = await runActor(ACTOR_INSTAGRAM, {
      hashtags:     [hashtag],
      resultsLimit: 10,
    });
    return results.map(r => ({
      url:      r.url || (r.shortCode ? `https://instagram.com/p/${r.shortCode}` : null),
      platform: 'Instagram',
      title:    r.caption?.slice(0, 80) || 'Instagram post',
      snippet:  `${r.likesCount || 0} likes`,
    })).filter(r => r.url);
  } catch (err) {
    logger.warn(`[SOCIAL] Instagram scrape failed: ${err.message}`);
    return [];
  }
}

async function runSocialScan(query) {
  if (!APIFY_TOKEN) {
    logger.warn('[SOCIAL] APIFY_API_TOKEN not set — skipping social scan');
    return [];
  }
  logger.info(`[SOCIAL] Running social scan for "${query}"`);
  const [tt, ig] = await Promise.all([scanTikTok(query), scanInstagram(query)]);
  const total = [...tt, ...ig];
  logger.info(`[SOCIAL] Total social results: ${total.length} (TT: ${tt.length}, IG: ${ig.length})`);
  return total;
}

module.exports = { runSocialScan };
