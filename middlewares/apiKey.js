const supabase = require('../config/db');
const logger   = require('../config/logger');

async function apiKeyMiddleware(req, res, next) {
  const key = req.headers[process.env.API_KEY_HEADER || 'x-vantage-key'];
  if (!key) return res.status(401).json({ error: 'Missing API key' });

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, tier')
    .eq('api_key', key)
    .single();

  if (error || !profile) {
    logger.warn('Invalid API key attempt', { ip: req.ip });
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.user     = { id: profile.id, email: profile.email };
  req.userTier = profile.tier;
  next();
}

module.exports = apiKeyMiddleware;
