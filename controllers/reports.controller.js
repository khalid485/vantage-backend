const supabase = require('../config/db');
const impact   = require('../services/impact.service');

/**
 * GET /api/reports/dashboard
 * Aggregate stats for the authenticated user's dashboard.
 */
async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;

    const [
      { count: totalScans },
      { count: totalViolations },
      { count: openCases },
      { count: resolvedCases },
      latestImpact
    ] = await Promise.all([
      supabase.from('scans').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('violations').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('cases').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).in('status', ['draft','approved','submitted']),
      supabase.from('cases').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('status', 'resolved'),
      impact.getLatestImpact(userId)
    ]);

    // Recent violations
    const { data: recentViolations } = await supabase
      .from('violations')
      .select('id, url, platform, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      stats: {
        totalScans:       totalScans    || 0,
        totalViolations:  totalViolations || 0,
        openCases:        openCases     || 0,
        resolvedCases:    resolvedCases || 0
      },
      latestImpact,
      recentViolations: recentViolations || []
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/audit
 * Paginated audit log for the authenticated user.
 */
async function getAuditLog(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const from = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw new Error(error.message);

    res.json({ logs: data, total: count, page, limit });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard, getAuditLog };
