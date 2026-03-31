const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const ctrl    = require('../controllers/reports.controller');

router.use(auth);

router.get('/dashboard', ctrl.getDashboard);
router.get('/audit',     ctrl.getAuditLog);

module.exports = router;
