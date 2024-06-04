const mongoose = require('mongoose');

const faceSchema = new mongoose.Schema({
   label: String,
   timeIn: Date,
   timeOut: Date,
}, { timestamps: true });

const Face = mongoose.model('Face', faceSchema);
module.exports = Face;
