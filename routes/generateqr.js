// Import necessary modules
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Define the correct directory path
const qrCodesDir = path.join(__dirname, '../qrcodes/qr-codes');  // Adjust if needed

// Ensure the 'qrcodes/qr-codes' directory exists
if (!fs.existsSync(qrCodesDir)) {
  fs.mkdirSync(qrCodesDir, { recursive: true });
}


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

  // Encode filename to handle spaces and special characters
  const encodedStaffName = encodeURIComponent(staffName);
  const qrCodePath = path.join(qrCodesDir, `${staffName}.png`);

  try {
    // Generate QR code and save to file
    await QRCode.toFile(qrCodePath, staffName);
    res.status(200).send({ message: `QR code generated successfully for ${staffName}`, qrCodePath: `/qrcodes/${encodedStaffName}.png` });
  } catch (error) {
    console.error(`Failed to generate QR code for ${staffName}:`, error);
    res.status(500).send('Failed to generate QR code');
  }
});

module.exports = router;
