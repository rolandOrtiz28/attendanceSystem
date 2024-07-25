const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const staff = [
  "Roland Ortiz", "Jhea Dela Cruz", "An Phatsa", "Bunchhorn Bien", "Samrith Chanthy", 
  "Ath Phyly", "Ath Sophaning", "Bouen Yuthakar", "Chen Nary", "Kong Pisey", 
  "Naim Bunna", "Ra Eiksreyka", "Sim Visal", "Sim Votey", "Sun Sophol", 
  "Tes Kosal", "Yoeun Chamnab", "Melvin Dela Cruz"
];

const outputDir = path.join(__dirname, 'qr-codes');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

staff.forEach(async (name) => {
  try {
    const qrCodePath = path.join(outputDir, `${name}.png`);
    await QRCode.toFile(qrCodePath, name);
    console.log(`QR code for ${name} generated successfully.`);
  } catch (error) {
    console.error(`Failed to generate QR code for ${name}:`, error);
  }
});
