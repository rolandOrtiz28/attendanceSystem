const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const faceSchema = new Schema({
   label: String,
}, { timestamps: true })


module.exports = mongoose.model('Face', faceSchema);