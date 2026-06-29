const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { upload } = require('../../middleware/upload');
const { countByOwnerWallet } = require('../../repositories/catRepository');
const { getAllBreeds } = require('../../repositories/breedRepository');

const router = express.Router();

/**
 * GET /cats/count
 *
 * Returns the total number of cats owned by the authenticated user.
 * Requires: Bearer token in Authorization header.
 *
 * Response 200:
 *   { count: number }
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

/**
 * GET /cats/breeds
 *
 * Returns the list of all available cat breeds.
 * Response 200: { breeds: [{ id, name, origin, description }] }
 */
router.get('/breeds', async (req, res) => {
  try {
    const breeds = await getAllBreeds();
    return res.status(200).json({ breeds });
  } catch (err) {
    console.error('[cats] Error fetching breeds:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /cats/images
 *
 * Upload up to 10 cat images.
 * Multipart body: `images` (file) × 1-10
 * Returns: { images: [{ url, filename }] }
 */
router.post('/images', authMiddleware, upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'At least 1 image is required' });
  }

  const images = req.files.map((file) => ({
    url: `/uploads/cats/${file.filename}`,
    filename: file.filename,
  }));

  res.json({ images });
});

router.use((err, _req, res, _next) => {
  if (err) return res.status(400).json({ message: err.message });
});

module.exports = router;
