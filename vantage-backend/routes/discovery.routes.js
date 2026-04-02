const express  = require('express');
const router   = express.Router();
const auth     = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const schemas  = require('../schemas');
const ctrl     = require('../controllers/discovery.controller');

router.use(auth);

router.post('/scan',          validate(schemas.startScan),              ctrl.startScan);
router.get('/scans',          validate(schemas.pagination, 'query'),    ctrl.listScans);
router.get('/violations',     validate(schemas.pagination, 'query'),    ctrl.listViolations);
router.patch('/violations/:id', validate(schemas.updateViolationStatus), ctrl.updateViolation);

module.exports = router;
