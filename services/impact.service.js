const supabase = require('../config/db');
const logger   = require('../config/logger');

// Conservative monthly erosion estimate per confirmed violation
const EROSION_PER_VIOLATION = 450;

/**
 * Calculate and persist a revenue erosion estimate for a completed scan.
 */
async function calculateImpact({ scanId, userId, violationCount }) {
  const erosionMonthly = violationCount * EROSION_PER_VIOLATION;
  const erosionAnnual  = erosionMonthly * 12;

  const { data, error } = await supabase
    .from('impact_estimates')
    .insert({
      scan_id:         scanId,
      user_id:         userId,
      violation_count: violationCount,
      erosion_monthly: erosionMonthly,
      erosion_annual:  erosionAnnual
    })
    .select()
    .single();

  if (error) {
    logger.error('Impact estimate write failed', { error: error.message });
    return null;
  }

  return data;
}

/**
 * Fetch the latest impact estimate for a user.
 */
async function getLatestImpact(userId) {
  const { data, error } = await supabase
    .from('impact_estimates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

module.exports = { calculateImpact, getLatestImpact };
