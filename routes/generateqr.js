// Import necessary modules
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Route to render QR code generation form
router.get('/generate-qr', (req, res) => {
  res.render('qrcode/generate-qr');
});

// Route to handle QR code generation
router.post('/api/generate-qr', async (req, res) => {
  const { staffName } = req.body;
  if (!staffName) {
    return res.status(400).send('Staff name is required');
  }

  try {
    const qrCodePath = path.join(__dirname, 'qr-codes', `${staffName}.png`);
    // Generate QR code and save to file
    await QRCode.toFile(qrCodePath, staffName);
    res.status(200).send({ message: `QR code generated successfully for ${staffName}`, qrCodePath });
  } catch (error) {
    console.error(`Failed to generate QR code for ${staffName}:`, error);
    res.status(500).send('Failed to generate QR code');
  }
});

module.exports = router;
