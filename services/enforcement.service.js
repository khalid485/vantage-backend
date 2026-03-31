const supabase = require('../config/db');
const logger   = require('../config/logger');
const audit    = require('./auditLog.service');

/**
 * Generate a DMCA takedown notice template.
 * Returns a draft — never auto-submits. Human approval required.
 */
function generateDmcaNotice({ ownerName, ownerEmail, workDescription, infringingUrl, platform }) {
  const date = new Date().toISOString().split('T')[0];

  return `DMCA TAKEDOWN NOTICE — ${date}

To: ${platform} Designated Copyright Agent

I, ${ownerName} ("Complainant"), hereby notify you of infringing material hosted on your platform.

1. IDENTIFICATION OF COPYRIGHTED WORK
   ${workDescription}

2. INFRINGING MATERIAL
   URL: ${infringingUrl}

3. GOOD FAITH STATEMENT
   I have a good faith belief that the use of the described material is not authorized
   by the copyright owner, its agent, or the law.

4. ACCURACY STATEMENT
   I declare, under penalty of perjury, that the information in this notification
   is accurate and that I am the copyright owner or authorized to act on their behalf.

5. CONTACT INFORMATION
   Name:  ${ownerName}
   Email: ${ownerEmail}

Signature: ${ownerName}
Date:      ${date}
`;
}

/**
 * Create a DMCA case draft. Status: 'draft' — awaits human approval.
 */
async function createCase({ userId, violationId, type = 'dmca', noticeBody }) {
  const { data, error } = await supabase
    .from('cases')
    .insert({
      user_id:      userId,
      violation_id: violationId,
      type,
      status:       'draft',
      notice_body:  noticeBody
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await audit.log({
    userId,
    action:   'case.created',
    entity:   'cases',
    entityId: data.id,
    meta:     { type, violationId }
  });

  return data;
}

/**
 * Approve a case for submission (human action required).
 */
async function approveCase({ caseId, userId, ip }) {
  const { data, error } = await supabase
    .from('cases')
    .update({ status: 'approved' })
    .eq('id', caseId)
    .eq('user_id', userId)      // enforce ownership
    .select()
    .single();

  if (error) throw new Error(error.message);

  await audit.log({
    userId,
    action:   'case.approved',
    entity:   'cases',
    entityId: caseId,
    ip
  });

  return data;
}

/**
 * Mark a case as submitted (after the user manually files the notice).
 */
async function markSubmitted({ caseId, userId, ip }) {
  const { data, error } = await supabase
    .from('cases')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', caseId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await audit.log({
    userId,
    action:   'case.submitted',
    entity:   'cases',
    entityId: caseId,
    ip
  });

  return data;
}

module.exports = { generateDmcaNotice, createCase, approveCase, markSubmitted };
