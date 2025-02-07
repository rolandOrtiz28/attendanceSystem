const mongoose = require('mongoose');
const timeEntrySchema = new mongoose.Schema({
   timeIn: Date,
   timeOut: Date,
   classLabel: String,
}, { _id: false });

const faceSchema = new mongoose.Schema({
   label: String,
   timeEntries: [timeEntrySchema],
}, { timestamps: true });

const Face = mongoose.model('Face', faceSchema);
module.exports = Face;
