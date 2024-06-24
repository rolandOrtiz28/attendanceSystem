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
      faceRecord.timeIn = new Date(); // Stores in UTC
    } else if (action === 'timeOut') {
      faceRecord.timeOut = new Date(); // Stores in UTC
    }

    await faceRecord.save();
    req.app.get('io').emit('face-updated', { label, action, time: faceRecord[action] });
    res.status(201).send(`Face ${action} recorded successfully`);
  } catch (error) {
    console.error('Error saving face data:', error);
    res.status(500).send('Error saving face data');
  }
});



router.get('/attendance', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the start of the day
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Set to the start of the next day

    // Find faces with timeIn or timeOut within the current day
    const faces = await Face.find({
      $or: [
        { timeIn: { $gte: today, $lt: tomorrow } },
        { timeOut: { $gte: today, $lt: tomorrow } }
      ]
    });

    res.render('./attendance/index', { faces, currentDate: today });
  } catch (error) {
    res.status(500).send('Error retrieving face data');
  }
});

module.exports = router