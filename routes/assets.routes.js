const express  = require('express');
const router   = express.Router();
const auth     = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const schemas  = require('../schemas');
const supabase = require('../config/db');
const audit    = require('../services/auditLog.service');

router.use(auth);

// List assets
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) { next(err); }
});

// Create asset
router.post('/', validate(schemas.createAsset), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .insert({ ...req.body, user_id: req.user.id })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await audit.log({
      userId: req.user.id, action: 'asset.created',
      entity: 'assets', entityId: data.id, ip: req.ip
    });

    res.status(201).json(data);
  } catch (err) { next(err); }
});

// Delete asset
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw new Error(error.message);

    await audit.log({
      userId: req.user.id, action: 'asset.deleted',
      entity: 'assets', entityId: req.params.id, ip: req.ip
    });

    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
