const express = require("express");
const router = express.Router();
const Teacher = require('../Model/teachers');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage })
const { cloudinary } = require('../cloudinary');

router.get('/form', (req,res)=>{
res.render('./teacher/form')
})

router.get('/', async(req,res)=>{
const teachers = await Teacher.find({})
    res.render('./teacher/index', {teachers})
})

router.post('/', upload.array('image'), async (req, res) => {
    await Teacher.deleteMany({})
    const teacher = new Teacher(req.body.teacher);
    teacher.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    console.log(teacher)
    await teacher.save();
    req.flash('success', 'Teacher added')
    res.redirect(`/teacher/form`);
});


module.exports = router