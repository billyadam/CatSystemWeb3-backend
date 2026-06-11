const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { upload } = require('../../middleware/upload');
const { countByOwnerWallet } = require('../../repositories/catRepository');

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

// POST /cats/images
// Multipart body: `images` (file) × 2
// Returns: { image_url_1, image_url_2 }
router.post('/images', authMiddleware, upload.array('images', 2), (req, res) => {
  if (!req.files || req.files.length !== 2) {
    return res.status(400).json({ message: 'Exactly 2 images are required' });
  }

  const [first, second] = req.files;
  res.json({
    image_url_1: `/uploads/cats/${first.filename}`,
    image_url_2: `/uploads/cats/${second.filename}`,
  });
});

router.use((err, _req, res, _next) => {
  if (err) return res.status(400).json({ message: err.message });
});

module.exports = router;
