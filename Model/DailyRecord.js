const mongoose = require('mongoose');

const dailyRecordSchema = new mongoose.Schema({
    label: String,
    date: { type: Date, default: Date.now },
    timeIn: Date,
    timeOut: Date
}, { timestamps: true });

const DailyRecord = mongoose.model('DailyRecord', dailyRecordSchema);
module.exports = DailyRecord;
