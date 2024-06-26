const express = require("express");
const router = express.Router();
const Face = require('../Model/face')
const detectedFaces = new Set();


router.get('/loginface', (req,res)=>{

res.render('home/loginface')
})

// router.get('/api/get-faces', async (req, res) => {
//   try {
//     // Get today's date at midnight
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     // Find today's records
//     const faces = await Face.find({
//       $or: [
//         { timeIn: { $gte: today } },
//         { timeOut: { $gte: today } }
//       ]
//     });

//     res.json(faces);
//   } catch (error) {
//     console.error('Error fetching face data:', error);
//     res.status(500).send('Error fetching face data');
//   }
// });
router.get('/api/get-faces', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const faces = await Face.find({
      'timeEntries.timeIn': { $gte: today }
    });

    res.json(faces);
  } catch (error) {
    console.error('Error fetching face data:', error);
    res.status(500).send('Error fetching face data');
  }
});




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
//       faceRecord.timeIn = new Date(); // Stores in UTC
//     } else if (action === 'timeOut') {
//       faceRecord.timeOut = new Date(); // Stores in UTC
//     }

//     await faceRecord.save();
//     req.app.get('io').emit('face-updated', { label, action, time: faceRecord[action] });
//     res.status(201).send(`Face ${action} recorded successfully`);
//   } catch (error) {
//     console.error('Error saving face data:', error);
//     res.status(500).send('Error saving face data');
//   }
// });
router.post('/api/detect-face', async (req, res) => {
  try {
    const { label, action } = req.body;
    console.log('Received face detection:', label, action);

    if (!['timeIn', 'timeOut'].includes(action)) {
      return res.status(400).send('Invalid action');
    }

    let faceRecord = await Face.findOne({ label });

    if (!faceRecord) {
      faceRecord = new Face({ label, timeEntries: [] });
    }

    const now = new Date();

    // Determine the class label based on the current time
    let classLabel;
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    if ((currentHour >= 7 && currentHour < 11) || (currentHour === 10 && currentMinutes <= 45)) {
      classLabel = 'Khmer Class (Full-Time)';
    } else if ((currentHour >= 13 && currentHour < 17) || (currentHour === 16 && currentMinutes <= 45)) {
      classLabel = 'English Class (Full-Time)';
    } else if ((currentHour >= 17 && currentHour < 20) || (currentHour === 19 && currentMinutes <= 30)) {
      classLabel = 'English Class (Part-Time)';
    } else {
      return res.status(400).send('Invalid class timing');
    }

    if (action === 'timeIn') {
      // Check if there's already a time entry for the same class without a timeOut
      const existingEntry = faceRecord.timeEntries.find(entry => entry.classLabel === classLabel && !entry.timeOut);
      if (existingEntry) {
        return res.status(400).send('Already timed in for this class');
      }
      faceRecord.timeEntries.push({ timeIn: now, classLabel });
    } else if (action === 'timeOut') {
      // Find the last time entry for the same class without a timeOut
      const lastEntry = faceRecord.timeEntries.find(entry => entry.classLabel === classLabel && !entry.timeOut);
      if (lastEntry) {
        lastEntry.timeOut = now;
      } else {
        return res.status(400).send('No matching time in entry found for time out');
      }
    }

    await faceRecord.save();
    req.app.get('io').emit('face-updated', { label, action, time: now, classLabel });
    res.status(201).send(`Face ${action} recorded successfully for ${classLabel}`);
  } catch (error) {
    console.error('Error saving face data:', error);
    res.status(500).send('Error saving face data');
  }
});


// router.get('/attendance', async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0); // Set to the start of the day
//     const tomorrow = new Date(today);
//     tomorrow.setDate(today.getDate() + 1); // Set to the start of the next day

//     // Find faces with timeIn or timeOut within the current day
//     const faces = await Face.find({
//       $or: [
//         { timeIn: { $gte: today, $lt: tomorrow } },
//         { timeOut: { $gte: today, $lt: tomorrow } }
//       ]
//     });

//     res.render('./attendance/index', { faces, currentDate: today });
//   } catch (error) {
//     res.status(500).send('Error retrieving face data');
//   }
// });
router.get('/attendance', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the start of the day
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Set to the start of the next day

    // Find faces with timeEntries within the current day
    const faces = await Face.find({
      timeEntries: {
        $elemMatch: {
          timeIn: { $gte: today, $lt: tomorrow }
        }
      }
    });

    console.log('Retrieved faces:', faces); // Log retrieved faces

    const recordsByClass = {
      'Khmer Class (Full-Time)': [],
      'English Class (Full-Time)': [],
      'English Class (Part-Time)': []
    };

    faces.forEach(face => {
      face.timeEntries.forEach(entry => {
        const timeIn = new Date(entry.timeIn);
        if (timeIn >= today && timeIn < tomorrow) {
          if (entry.classLabel) {
            recordsByClass[entry.classLabel].push({
              label: face.label,
              timeIn: entry.timeIn,
              timeOut: entry.timeOut
            });
          }
        }
      });
    });

    console.log('Categorized records:', recordsByClass); // Log categorized records

    res.render('./attendance/index', { recordsByClass, currentDate: today });
  } catch (error) {
    console.error('Error retrieving face data:', error);
    res.status(500).send('Error retrieving face data');
  }
});


module.exports = router