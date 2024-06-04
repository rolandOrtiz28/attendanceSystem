const express = require("express");
const router = express.Router();
const Face = require('../Model/face')
const detectedFaces = new Set();


router.get('/loginface', (req,res)=>{

res.render('home/loginface')
})

router.get('/api/get-faces', async (req, res) => {
  try {
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's records
    const faces = await Face.find({
      $or: [
        { timeIn: { $gte: today } },
        { timeOut: { $gte: today } }
      ]
    });

    res.json(faces);
  } catch (error) {
    console.error('Error fetching face data:', error);
    res.status(500).send('Error fetching face data');
  }
});



router.post('/api/detect-face', async (req, res) => {
  try {
    const { label, action } = req.body;
    console.log('Received face detection:', label, action);

    if (!['timeIn', 'timeOut'].includes(action)) {
      return res.status(400).send('Invalid action');
    }

    let faceRecord = await Face.findOne({ label });

    if (!faceRecord) {
      faceRecord = new Face({ label });
    }

    if (action === 'timeIn') {
      faceRecord.timeIn = new Date();
    } else if (action === 'timeOut') {
      faceRecord.timeOut = new Date();
    }

    await faceRecord.save();
    req.app.get('io').emit('face-updated', { label, action, time: faceRecord[action] });
    res.status(201).send(`Face ${action} recorded successfully`);
  } catch (error) {
    console.error('Error saving face data:', error);
    res.status(500).send('Error saving face data');
  }
});

// soon to be deleted


// router.post('/api/detect-face', async (req, res) => {
//   try {
//     const { label, action } = req.body;
//     console.log('Received face detection:', label, action);

//     if (!['timeIn', 'timeOut'].includes(action)) {
//       return res.status(400).send('Invalid action');
//     }

//     let faceRecord = await Face.findOne({ label });

//     if (!faceRecord) {
//       faceRecord = new Face({ label });
//     }

//     if (action === 'timeIn') {
//       faceRecord.timeIn = new Date();
//     } else if (action === 'timeOut') {
//       faceRecord.timeOut = new Date();
//     }

//     await faceRecord.save();
//     res.status(201).send(`Face ${action} recorded successfully`);
//   } catch (error) {
//     console.error('Error saving face data:', error);
//     res.status(500).send('Error saving face data');
//   }
// });


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


router.get('/api/get-faces', async (req, res) => {
  try {
    const faces = await Face.find();
    res.json(faces);
  } catch (error) {
    res.status(500).send('Error retrieving face data');
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