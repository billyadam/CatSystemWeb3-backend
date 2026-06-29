const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { uploadPdf } = require('../../services/uploadPdf');
const { findByWallet, insertOnboarding } = require('../../repositories/userRepository');
const { findActiveRequestByWallet, createBreederRequest } = require('../../repositories/requestRepository');

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

/**
 * POST /users/request-breeder
 *
 * Submit a breeder upgrade request with a supporting PDF document.
 * Multipart body: `document` (file, PDF only, max 10 MB)
 * Requires: Bearer token in Authorization header.
 *
 * Response 201:
 *   { message, request: { id, user_wallet, requested_at, status, document_url } }
 */
router.post('/request-breeder', authMiddleware, uploadPdf.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'A PDF document is required.' });
  }

  const documentUrl = `/uploads/request-breeder/${req.file.filename}`;

  try {
    // Guard: prevent duplicate active requests
    const existing = await findActiveRequestByWallet(req.user.wallet);
    if (existing) {
      return res.status(409).json({
        message:
          existing.status === 'approved'
            ? 'Your breeder upgrade has already been approved.'
            : 'You already have a pending breeder upgrade request.',
        status: existing.status,
      });
    }

    const request = await createBreederRequest(req.user.wallet, documentUrl);

    return res.status(201).json({
      message: 'Breeder upgrade request submitted successfully.',
      request: {
        id: request.id,
        user_wallet: request.user_wallet,
        requested_at: request.requested_at,
        status: request.status,
        document_url: request.document_url,
      },
    });
  } catch (err) {
    console.error('[users] Error creating breeder request:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.use((err, _req, res, _next) => {
  if (err) return res.status(400).json({ message: err.message });
});

module.exports = router;