const express  = require('express');
const router   = express.Router();
const auth     = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const schemas  = require('../schemas');
const ctrl     = require('../controllers/cases.controller');

router.use(auth);

router.post('/',              validate(schemas.createCase),             ctrl.createCase);
router.get('/',               validate(schemas.pagination, 'query'),    ctrl.listCases);
router.get('/:id',                                                       ctrl.getCase);
router.patch('/:id/approve',                                             ctrl.approveCase);
router.patch('/:id/submit',                                              ctrl.submitCase);

module.exports = router;
