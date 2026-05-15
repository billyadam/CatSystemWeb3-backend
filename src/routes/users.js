const express = require('express');
const authMiddleware = require('../middleware/auth');
const { updateOnboarding } = require('../repositories/userRepository');

const router = express.Router();

// POST /users/onboard
// Body: { name: string, bio?: string, username: string }
// Requires: Bearer token (authMiddleware)
router.post('/onboard', authMiddleware, async (req, res) => {
  const { name, bio, username } = req.body;

  // Validate: name and username are required and must not be whitespace-only
  if (!name || !username || name.trim() === '' || username.trim() === '') {
    return res.status(400).json({ message: 'name and username are required' });
  }

  let user;
  try {
    user = await updateOnboarding(req.user.wallet, {
      name: name.trim(),
      bio: bio?.trim() ?? null,
      username: username.trim(),
    });
  } catch (err) {
    // Handle unique constraint violation on username (PostgreSQL error code 23505)
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Username already taken' });
    }

    console.error('[users] Database error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }

  return res.status(200).json({
    wallet: user.wallet_address,
    name: user.name,
    bio: user.bio,
    username: user.username,
    onboarded: true,
  });
});

module.exports = router;
