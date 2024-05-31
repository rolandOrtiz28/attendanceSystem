const express = require("express");
const router = express.Router();
const Face = require('../Model/face')



router.get('/loginface', (req,res)=>{

res.render('home/loginface')
})



// const detectedFaces = new Set();

// // Define route handler for face detection
// router.post('/api/detect-face', async (req, res) => {
//   try {
//     const { label } = req.body;
//     console.log('Received face detection:', label);

//     // Check if this face has been detected before
//     if (!detectedFaces.has(label)) {
//       // Add the label to the set of detected faces
//       detectedFaces.add(label);
//       const newFace = new Face({ label });
//       await newFace.save();

//       res.status(201).send('Face detected and saved successfully');
//     } else {
//       console.log('Face already detected:', label);
//       res.status(200).send('Face already detected');
//     }
//   } catch (error) {
//     console.error('Error saving face data:', error);
//     res.status(500).send('Error saving face data');
//   }
// });


const detectedFaces = new Set();

// Define route handler for face detection
router.post('/api/detect-face', async (req, res) => {

  try {
    const { label } = req.body;
    console.log('Received face detection:', label);

    // Check if this face has been detected before
    if (!detectedFaces.has(label)) {
      // Add the label to the set of detected faces
      detectedFaces.add(label);
      const newFace = new Face({ label });
      await newFace.save();

      res.status(201).send('Face detected and saved successfully');
    } else {
      console.log('Face already detected:', label);
      res.status(200).send('Face already detected');
    }
  } catch (error) {
    console.error('Error saving face data:', error);
    res.status(500).send('Error saving face data');
  }
});



router.get('/attendance', async (req, res) => {

  try {
    const faces = await Face.find();
    res.render('./attendance/index', {faces})
  } catch (error) {
    res.status(500).send('Error retrieving face data');
  }
});


module.exports = router