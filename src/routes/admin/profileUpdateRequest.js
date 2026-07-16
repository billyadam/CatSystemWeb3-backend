const express = require('express');
const adminMiddleware = require('../../middleware/admin');

const {
  findAll,
  findById,
} = require('../../repositories/profileUpdateRequestRepository');

const router = express.Router();

const ALLOWED_STATUSES = ['pending', 'approved', 'rejected'];
const ALLOWED_LIMITS = [10, 25, 50, 100];

// GET /profile-update-requests
// Query params: status, page, limit
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = ALLOWED_LIMITS.includes(rawLimit) ? rawLimit : 10;

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
    }

    const result = await findAll({ status: status || undefined, page, limit });
    return res.status(200).json(result);
  } catch (err) {
    console.error('[profile-update-requests] Error fetching list:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /profile-update-requests/:id
router.get('/:id', adminMiddleware, async (req, res) => {
  try {
    const request = await findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Profile update request not found' });
    }
    return res.status(200).json({ data: request });
  } catch (err) {
    console.error('[profile-update-requests] Error fetching detail:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
