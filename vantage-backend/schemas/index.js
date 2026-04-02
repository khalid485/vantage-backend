const Joi = require('joi');

const schemas = {

  // Discovery
  startScan: Joi.object({
    query:    Joi.string().min(2).max(200).required(),
    assetId:  Joi.string().uuid().optional()
  }),

  // Assets
  createAsset: Joi.object({
    label:       Joi.string().min(1).max(120).required(),
    fingerprint: Joi.string().max(512).optional(),
    metadata:    Joi.object().optional()
  }),

  // Cases
  createCase: Joi.object({
    violationId: Joi.string().uuid().required(),
    type:        Joi.string().valid('dmca', 'platform_report', 'legal_notice').default('dmca')
  }),

  updateCaseStatus: Joi.object({
    status: Joi.string()
      .valid('draft', 'approved', 'submitted', 'acknowledged', 'resolved', 'rejected')
      .required()
  }),

  // Violations
  updateViolationStatus: Joi.object({
    status: Joi.string()
      .valid('detected', 'reviewing', 'actioned', 'dismissed', 'resolved')
      .required()
  }),

  // Pagination
  pagination: Joi.object({
    page:  Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })

};

module.exports = schemas;
