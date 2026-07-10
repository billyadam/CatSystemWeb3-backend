const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { uploadCatImage } = require('../../services/uploadCatImage');
const { countByOwnerWallet, findByOwnerWallet, findByPda } = require('../../repositories/catRepository');
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
 * GET /cats
 *
 * Lists the cats owned by the authenticated user, returning only the fields
 * the cat-list card renders. Requires: Bearer token in Authorization header.
 *
 * Response 200:
 *   { cats: [{ cat_pda, name, gender, breed, image_url, block_time }] }
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rows = await findByOwnerWallet(req.user.wallet);
    const cats = rows.map((c) => ({
      cat_pda: c.cat_pda,
      name: c.name,
      gender: c.gender,
      breed: c.breed || '',
      image_url: c.image_url || null,
      block_time: c.block_time != null ? Number(c.block_time) : null,
    }));
    return res.status(200).json({ cats });
  } catch (err) {
    console.error('[cats] Error listing cats:', err.message);
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
router.post('/images', authMiddleware, uploadCatImage.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'At least 1 image is required' });
  }

  const images = req.files.map((file) => ({
    url: `/uploads/cats/${file.filename}`,
    filename: file.filename,
  }));

  res.json({ images });
});

/**
 * GET /cats/:pda
 *
 * Returns a single cat owned by the authenticated user, with the fields the
 * individual cat page renders (header, DNA profile, bio, owner).
 * Requires: Bearer token in Authorization header.
 * Response 200: { cat: { cat_pda, owner_wallet, name, gender, image_url, block_time, bio_profile } }
 * Response 404: cat not found
 * Response 403: cat belongs to another owner
 */
router.get('/:pda', authMiddleware, async (req, res) => {
  try {
    const cat = await findByPda(req.params.pda);
    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }
    if (cat.owner_wallet !== req.user.wallet) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.status(200).json({
      cat: {
        cat_pda: cat.cat_pda,
        owner_wallet: cat.owner_wallet,
        name: cat.name,
        gender: cat.gender,
        image_url: cat.image_url || null,
        block_time: cat.block_time != null ? Number(cat.block_time) : null,
        bio_profile: cat.bio_profile,
        images: (cat.images || []).map((img) => ({
          url: img.image_url,
          description: img.description || null,
        })),
      },
    });
  } catch (err) {
    console.error('[cats] Error fetching cat:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.use((err, _req, res, _next) => {
  if (err) return res.status(400).json({ message: err.message });
});

module.exports = router;
