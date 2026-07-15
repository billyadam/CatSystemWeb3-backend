const express = require('express');
const adminMiddleware = require('../../middleware/admin');

const {
  findAllProfileUpdates,
  findProfileUpdatesByStatus,
  findProfileUpdateById,
} = require('../../repositories/userRepository');
const {
  approveProfileUpdateRequest,
  rejectProfileUpdateRequest,
} = require('../../services/profileUpdateService');

const router = express.Router();

// GET /profile-updates?status=(pending/approved/rejected)
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const requests = status
      ? await findProfileUpdatesByStatus(status)
      : await findAllProfileUpdates();
    return res.status(200).json({ data: requests });
  } catch (err) {
    console.error('[profile-updates] Error fetching requests:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /profile-updates/:id
router.get('/:id', adminMiddleware, async (req, res) => {
  try {
    const request = await findProfileUpdateById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    return res.json(request);
  } catch (err) {
    console.error('[profile-updates] Error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /profile-updates/:id/accept
// Body: { action: "approved" | "rejected" }
router.patch('/:id/accept', adminMiddleware, async (req, res) => {
  const { action } = req.body;
  const requestId = req.params.id;
  const adminWallet = req.user.wallet;

  if (!action || !['approved', 'rejected'].includes(action)) {
    return res
      .status(400)
      .json({ message: "action must be 'approved' or 'rejected'" });
  }

  try {
    if (action === 'rejected') {
      const request = await rejectProfileUpdateRequest(requestId, adminWallet);
      return res.json({ message: 'Profile update request rejected', request });
    }

    // Approved → transaction block (request + user)
    const { request, user } = await approveProfileUpdateRequest(requestId, adminWallet);
    return res.json({
      message: 'Profile update request approved, user profile updated',
      request,
      user: {
        wallet_address: user.wallet_address,
        name: user.name,
        phone_number: user.phone_number,
        email: user.email,
        country: user.country,
        city: user.city,
      },
    });
  } catch (err) {
    console.error('[profile-updates] Accept error:', err.message);

    if (err.message === 'Request not found' || err.message === 'User not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'Request is not pending') {
      return res.status(409).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
