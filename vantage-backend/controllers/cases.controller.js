const supabase     = require('../config/db');
const enforcement  = require('../services/enforcement.service');
const audit        = require('../services/auditLog.service');

/**
 * POST /api/cases
 * Create a DMCA case draft from a violation.
 */
async function createCase(req, res, next) {
  try {
    const { violationId, type } = req.body;
    const userId = req.user.id;

    // Fetch the violation to build the notice
    const { data: violation, error: vErr } = await supabase
      .from('violations')
      .select('*')
      .eq('id', violationId)
      .eq('user_id', userId)
      .single();

    if (vErr || !violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }

    // Fetch the user's profile for the notice
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const noticeBody = enforcement.generateDmcaNotice({
      ownerName:        profile?.email || 'Creator',
      ownerEmail:       profile?.email || '',
      workDescription:  `Digital content identified via VANTAGE scan`,
      infringingUrl:    violation.url,
      platform:         violation.platform || 'Unknown Platform'
    });

    const caseData = await enforcement.createCase({
      userId,
      violationId,
      type,
      noticeBody
    });

    res.status(201).json(caseData);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/cases
 * List all cases for the authenticated user.
 */
async function listCases(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const from = (page - 1) * limit;

    let q = supabase
      .from('cases')
      .select('*, violations(url, platform)', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (status) q = q.eq('status', status);

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);

    res.json({ cases: data, total: count, page, limit });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/cases/:id
 * Get a single case with full notice body.
 */
async function getCase(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, violations(url, platform, title)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found' });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/cases/:id/approve
 * Human approves a draft case for submission.
 */
async function approveCase(req, res, next) {
  try {
    const data = await enforcement.approveCase({
      caseId: req.params.id,
      userId: req.user.id,
      ip:     req.ip
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/cases/:id/submit
 * Mark a case as submitted after manual filing.
 */
async function submitCase(req, res, next) {
  try {
    const data = await enforcement.markSubmitted({
      caseId: req.params.id,
      userId: req.user.id,
      ip:     req.ip
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { createCase, listCases, getCase, approveCase, submitCase };
