const express = require("express");
const router = express.Router();
const Face = require('../Model/face')



router.get('/loginface', (req,res)=>{

res.render('home/loginface')
})


router.post('/api/detect-face', async (req, res) => {

  try {
    const { label } = req.body;
console.log(label)
    const newFace = new Face({ label });
    await newFace.save();
    res.status(201).send('Face detected and saved successfully');
  } catch (error) {
    res.status(500).send('Error saving face data');
  }
});

router.get('/api/detected-faces', async (req, res) => {

  try {
    const faces = await Face.find();
    res.json(faces);
  } catch (error) {
    res.status(500).send('Error retrieving face data');
  }
});


module.exports = router