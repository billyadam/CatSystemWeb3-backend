const express = require('express');
const authMiddleware = require('../middleware/auth');
const { findByWallet, insertOnboarding } = require('../repositories/userRepository');

const router = express.Router();

// POST /users/onboard
// Body: { name: string, bio?: string }
// Requires: Bearer token (authMiddleware)
router.post('/onboard', authMiddleware, async (req, res) => {
  const { name, bio } = req.body;

  // Validate: name are required and must not be whitespace-only
  if (!name) {
    return res.status(400).json({ message: 'name are required' });
  }

  let user;
  try {
    user = await insertOnboarding(req.user.wallet, {
      name: name.trim(),
      bio: bio?.trim() ?? null,
    });
  } catch (err) {
    console.error('[users] Database error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }

  return res.status(200).json({
    wallet: user.wallet_address,
    name: user.name,
    bio: user.bio,
    onboarded: true,
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await findByWallet(req.user.wallet);
    res.json({ id: req.user.sub, wallet: req.user.wallet, user_data: user });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
