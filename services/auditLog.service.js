const supabase = require('../config/db');
const logger   = require('../config/logger');

/**
 * Append an entry to the immutable audit log.
 * Never throws — logs locally on Supabase failure.
 */
async function log({ userId, action, entity, entityId, meta = {}, ip }) {
  const { error } = await supabase.from('audit_log').insert({
    user_id:   userId,
    action,
    entity,
    entity_id: entityId,
    meta,
    ip
  });

  if (error) {
    logger.error('Audit log write failed', { error: error.message, action, userId });
  }
}

module.exports = { log };
