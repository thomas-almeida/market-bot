const { Router } = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const BotConfig = require('../models/BotConfig');
const Session = require('../models/Session');
const Transaction = require('../models/Transaction');
const AdminToken = require('../models/AdminToken');
const { uploadImage } = require('../services/cloudinary.service');
const cloudinary = require('cloudinary').v2;
const adminAuth = require('../middleware/adminAuth');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- Auth (no middleware required) ---
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: true, message: 'Email required' });
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await AdminToken.create({ email, token, expiresAt });

    res.json({ token, expiresAt });
  } catch (err) {
    console.error('Admin login error:', err.message);
    res.status(500).json({ error: true, message: 'Failed to generate token' });
  }
});

// --- Bot Config (protected) ---

router.get('/config', adminAuth, async (req, res) => {
  try {
    const config = await BotConfig.getOrCreate();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Failed to get config' });
  }
});

router.put('/config', adminAuth, async (req, res) => {
  try {
    const { welcomeMessage, welcomeImageUrls, products } = req.body;
    const config = await BotConfig.getOrCreate();

    if (welcomeMessage !== undefined) config.welcomeMessage = welcomeMessage;
    if (welcomeImageUrls !== undefined) config.welcomeImageUrls = welcomeImageUrls;
    if (products !== undefined) config.products = products;

    config.updatedAt = new Date();
    await config.save();

    res.json(config);
  } catch (err) {
    console.error('Update config error:', err.message);
    res.status(500).json({ error: true, message: 'Failed to update config' });
  }
});

// --- Image Upload (protected) ---

router.post('/upload-image', adminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No image provided' });
    }

    const url = await uploadImage(req.file.buffer);
    res.json({ url });
  } catch (err) {
    console.error('Upload error:', err.message);
    console.log('Upload error details:', err);
    res.status(500).json({ error: true, message: 'Failed to upload image' });
  }
});

// --- Image Delete (protected) ---
router.delete('/delete-image', adminAuth, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: true, message: 'Image URL required' });
    }

    // Extract public ID from Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{extension}
    const urlParts = imageUrl.split('/');
    const publicIdWithExtension = urlParts.pop(); // Get the last part
    const publicId = publicIdWithExtension.split('.')[0]; // Remove extension

    // Reconstruct public ID with folder structure if present
    const folderIndex = urlParts.indexOf('upload') + 2;
    const folderPath = urlParts.slice(folderIndex, -1).join('/');
    const fullPublicId = folderPath ? `${folderPath}/${publicId}` : publicId;

    await cloudinary.uploader.destroy(fullPublicId);
    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Delete image error:', err.message);
    res.status(500).json({ error: true, message: 'Failed to delete image' });
  }
});

// --- Transactions (protected) ---

router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status && ['PENDING', 'PAID', 'EXPIRED'].includes(status)) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.json({ transactions, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('List transactions error:', err.message);
    res.status(500).json({ error: true, message: 'Failed to list transactions' });
  }
});

// --- Sessions (protected) ---

router.get('/sessions', adminAuth, async (req, res) => {
  try {
    const sessions = await Session.find().sort({ startedAt: -1 }).limit(50);
    res.json({ sessions });
  } catch (err) {
    console.error('List sessions error:', err.message);
    res.status(500).json({ error: true, message: 'Failed to list sessions' });
  }
});

module.exports = router;