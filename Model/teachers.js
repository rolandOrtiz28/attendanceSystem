const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const imageSchema = new Schema({
    url: String,
    filename: String
});


imageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_200,h_200');
})

const teacherSchema = new Schema({
    images: [imageSchema],
    firstName: {
    type: String,
    required: true,
    },
    lastName:{
    type: String,
    required: true,
    },
    position:{
    type: String,
    required: true,
    },
    age:{
    type: Number,
    required: true,
    },
    birthDate:{
    type: String,
    required: true,
    }
});

module.exports = mongoose.model('Teacher', teacherSchema);