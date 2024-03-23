const express = require("express");
const router = express.Router();
const Teacher = require('../Model/teachers');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage })
const { cloudinary } = require('../cloudinary');


router.post('/new', upload.array('image'), async (req, res) => {
    const teacher = new teacher(req.body.teacher);
    teacher.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    await teacher.save();
    req.flash('success', 'Teacher added')
    res.redirect(`/`);
});


module.exports = router