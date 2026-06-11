const express = require('express');
const adminMiddleware = require('../../middleware/admin');
const { findByWallet } = require('../../repositories/adminRepository');

const router = express.Router();

router.get('/me', adminMiddleware, async (req, res) => {
  try {
    const admin = await findByWallet(req.user.wallet);
    res.json({ wallet: req.user.wallet, admin_data: admin });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
