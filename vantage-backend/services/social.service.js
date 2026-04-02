const axios = require('axios');
const logger = require('../config/logger');

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE  = 'https://api.apify.com/v2';

const ACTOR_TIKTOK    = 'GdWCkxBtKWOsKjdch';
const ACTOR_INSTAGRAM = 'shu8hvrXbJbY3Eb9W';

async function runActor(actorId, input) {
  const run = await axios.post(
    `${APIFY_BASE}/acts/${actorId}/runs?token=${APIFY_TOKEN}&timeout=180`,
    input,
    { headers: { 'Content-Type': 'application/json' }, timeout: 240000 }
  );
  const runId = run.data.data.id;
  logger.info(`[SOCIAL] Run started: ${runId}`);

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await axios.get(`${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    const st = statusRes.data.data.status;
    logger.info(`[SOCIAL] Status: ${st} (${i + 1}/60)`);
    if (st === 'SUCCEEDED') break;
    if (['FAILED','ABORTED','TIMED-OUT'].includes(st)) throw new Error(`Actor ended: ${st}`);
  }

  const dataset = await axios.get(
    `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=1000`
  );
  return dataset.data || [];
}

async function scanTikTok(query) {
  const base    = query.replace(/\s+/g, '').toLowerCase();
  const parts   = query.toLowerCase().split(/\s+/).filter(p => p.length > 2);
  const seen    = new Set();
  const results = [];

  // Strategy 1: hashtags (one at a time to avoid blocks)
  const hashtags = [...new Set([base, ...parts])];
  for (const hashtag of hashtags) {
    try {
      logger.info(`[SOCIAL] TikTok hashtag: #${hashtag}`);
      const items = await runActor(ACTOR_TIKTOK, {
        hashtags:                [hashtag],
        resultsPerPage:          200,
        maxResults:              200,
        shouldDownloadVideos:    false,
        shouldDownloadCovers:    false,
        shouldDownloadSubtitles: false,
      });
      items.forEach(r => {
        const url = r.webVideoUrl || (r.id ? `https://tiktok.com/@${r.authorMeta?.name}/video/${r.id}` : null);
        if (url && !seen.has(url)) { seen.add(url); results.push({ url, platform: 'TikTok', title: r.text?.slice(0,80)||'TikTok video', snippet: `${r.diggCount||0} likes · ${r.playCount||0} views` }); }
      });
      logger.info(`[SOCIAL] TikTok running total: ${results.length}`);
    } catch (err) { logger.warn(`[SOCIAL] TikTok #${hashtag} failed: ${err.message}`); }
  }

  // Strategy 2: keyword search
  const searches = [...new Set([query, ...parts])];
  for (const search of searches) {
    try {
      logger.info(`[SOCIAL] TikTok search: "${search}"`);
      const items = await runActor(ACTOR_TIKTOK, {
        searchQueries:           [search],
        resultsPerPage:          200,
        maxResults:              200,
        shouldDownloadVideos:    false,
        shouldDownloadCovers:    false,
        shouldDownloadSubtitles: false,
      });
      items.forEach(r => {
        const url = r.webVideoUrl || (r.id ? `https://tiktok.com/@${r.authorMeta?.name}/video/${r.id}` : null);
        if (url && !seen.has(url)) { seen.add(url); results.push({ url, platform: 'TikTok', title: r.text?.slice(0,80)||'TikTok video', snippet: `${r.diggCount||0} likes · ${r.playCount||0} views` }); }
      });
      logger.info(`[SOCIAL] TikTok running total: ${results.length}`);
    } catch (err) { logger.warn(`[SOCIAL] TikTok search "${search}" failed: ${err.message}`); }
  }

  logger.info(`[SOCIAL] TikTok FINAL: ${results.length} unique results`);
  return results;
}

async function scanInstagram(query) {
  const base    = query.replace(/\s+/g, '').toLowerCase();
  const parts   = query.toLowerCase().split(/\s+/).filter(p => p.length > 2);
  const seen    = new Set();
  const results = [];

  const hashtags = [...new Set([base, ...parts])];
  for (const hashtag of hashtags) {
    try {
      logger.info(`[SOCIAL] Instagram hashtag: #${hashtag}`);
      const items = await runActor(ACTOR_INSTAGRAM, {
        directUrls:   [`https://www.instagram.com/explore/tags/${hashtag}/`],
        resultsType:  'posts',
        resultsLimit: 200,
      });
      items.forEach(r => {
        const url = r.url || (r.shortCode ? `https://instagram.com/p/${r.shortCode}` : null);
        if (url && !seen.has(url)) { seen.add(url); results.push({ url, platform: 'Instagram', title: r.caption?.slice(0,80)||'Instagram post', snippet: `${r.likesCount||0} likes` }); }
      });
      logger.info(`[SOCIAL] Instagram running total: ${results.length}`);
    } catch (err) { logger.warn(`[SOCIAL] Instagram #${hashtag} failed: ${err.message}`); }
  }

  logger.info(`[SOCIAL] Instagram FINAL: ${results.length} unique results`);
  return results;
}

async function runSocialScan(query) {
  if (!APIFY_TOKEN) {
    logger.warn('[SOCIAL] APIFY_API_TOKEN not set');
    return [];
  }
  logger.info(`[SOCIAL] Starting sequential scan for "${query}"`);

  // Sequential — TikTok first, then Instagram
  const tt = await scanTikTok(query);
  const ig = await scanInstagram(query);

  const total = [...tt, ...ig];
  logger.info(`[SOCIAL] COMPLETE: ${total.length} total (TT: ${tt.length}, IG: ${ig.length})`);
  return total;
}

module.exports = { runSocialScan };
