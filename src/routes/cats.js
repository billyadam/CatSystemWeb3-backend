const express = require('express');
const authMiddleware = require('../middleware/auth');
const { countByOwnerWallet } = require('../repositories/catRepository');

const router = express.Router();

/**
 * GET /cats/count
 *
 * Returns the total number of cats owned by the authenticated user.
 * Requires: Bearer token in Authorization header.
 *
 * Response 200:
 *   { count: number }
 *
 * Response 401: Missing / invalid token (handled by authMiddleware)
 * Response 500: Unexpected server error
 */
router.get('/count', authMiddleware, async (req, res) => {
  try {
    const count = await countByOwnerWallet(req.user.wallet);

    return res.status(200).json({ count });
  } catch (err) {
    console.error('[cats] Error counting cats:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
