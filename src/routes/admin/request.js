const express = require('express');
const adminMiddleware = require('../../middleware/admin');
const { findAll, findByStatus } = require('../../repositories/requestRepository');

const router = express.Router();

router.get('/', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const requests = status ? await findByStatus(status) : await findAll();
    return res.status(200).json({ data: requests });
  } catch (err) {
    console.error('[requests] Error fetching requests:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
