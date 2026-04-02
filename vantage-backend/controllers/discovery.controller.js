const supabase   = require('../config/db');
const discovery  = require('../services/discovery.service');
const social     = require('../services/social.service');
const impact     = require('../services/impact.service');
const audit      = require('../services/auditLog.service');
const logger     = require('../config/logger');

async function startScan(req, res, next) {
  try {
    const { query, assetId } = req.body;
    const userId = req.user.id;

    const { data: scan, error: scanErr } = await supabase
      .from('scans')
      .insert({
        user_id:    userId,
        asset_id:   assetId || null,
        query,
        status:     'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (scanErr) throw new Error(scanErr.message);

    // Run both scans in parallel
    const [webResults, socialResults] = await Promise.all([
      discovery.runDiscoveryScan(query),
      social.runSocialScan(query)
    ]);

    const results = [...webResults, ...socialResults];

    if (results.length > 0) {
      const rows = results.map(r => ({
        scan_id:  scan.id,
        user_id:  userId,
        url:      r.url,
        platform: r.platform,
        title:    r.title,
        snippet:  r.snippet,
        status:   'detected'
      }));
      await supabase.from('violations').insert(rows);
    }

    await supabase.from('scans').update({
      status:       'complete',
      result_count: results.length,
      completed_at: new Date().toISOString()
    }).eq('id', scan.id);

    const impactData = await impact.calculateImpact({
      scanId:         scan.id,
      userId,
      violationCount: results.length
    });

    await audit.log({
      userId,
      action:   'scan.completed',
      entity:   'scans',
      entityId: scan.id,
      meta:     { resultCount: results.length, query },
      ip:       req.ip
    });

    res.json({
      scanId:         scan.id,
      violationCount: results.length,
      violations:     results,
      impactEstimate: impactData
    });

  } catch (err) {
    next(err);
  }
}

async function listScans(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const from = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('scans')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw new Error(error.message);
    res.json({ scans: data, total: count, page, limit });
  } catch (err) {
    next(err);
  }
}

async function listViolations(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const from = (page - 1) * limit;

    let q = supabase
      .from('violations')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (status) q = q.eq('status', status);

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    res.json({ violations: data, total: count, page, limit });
  } catch (err) {
    next(err);
  }
}

async function updateViolation(req, res, next) {
  try {
    const { id }     = req.params;
    const { status } = req.body;
    const userId     = req.user.id;

    const { data, error } = await supabase
      .from('violations')
      .update({ status, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await audit.log({
      userId,
      action:   'violation.reviewed',
      entity:   'violations',
      entityId: id,
      meta:     { status },
      ip:       req.ip
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { startScan, listScans, listViolations, updateViolation };
