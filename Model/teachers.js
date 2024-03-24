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
    },
    lastName:{
    type: String,
    },
    position:{
    type: String,
    },
    age:{
    type: Number,
    },
    birthDate:{
    type: Date,
    },
    phoneNumber:{
    type: String,
    }
});

module.exports = mongoose.model('Teacher', teacherSchema);