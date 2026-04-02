const { createClient } = require('@supabase/supabase-js');
const logger = require('../config/logger');

// Lazy-initialised so the module loads without crashing when env vars are missing at test time
let supabasePublic;
function getClient() {
  if (!supabasePublic) {
    supabasePublic = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabasePublic;
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await getClient().auth.getUser(token);

  if (error || !user) {
    logger.warn('Auth failed', { error: error?.message, ip: req.ip });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

module.exports = authMiddleware;
