const express = require("express");
const router = express.Router();
const Face = require('../Model/face')
const detectedFaces = new Set();
const moment = require('moment-timezone');

router.get('/loginface', (req,res)=>{

res.render('home/loginface')
})

router.get('/api/get-faces', async (req, res) => {
  try {
    const todayStart = moment().tz('Asia/Phnom_Penh').startOf('day').toDate();
    const tomorrowStart = moment().tz('Asia/Phnom_Penh').add(1, 'day').startOf('day').toDate();

    const faces = await Face.find({
      'timeEntries.timeIn': { $gte: todayStart, $lt: tomorrowStart }
    });

    // Filter time entries to only include those from today
    const filteredFaces = faces.map(face => ({
      label: face.label,
      timeEntries: face.timeEntries.filter(entry => {
        const timeIn = moment(entry.timeIn).tz('Asia/Phnom_Penh');
        return timeIn.isSame(todayStart, 'day');
      })
    }));

    res.json(filteredFaces);
  } catch (error) {
    console.error('Error fetching face data:', error);
    res.status(500).send('Error fetching face data');
  }
});
router.post('/api/detect-qr', async (req, res) => {

  console.log('Request body:', req.body);

  try {
    const { qrCode, action, clientTime, classLabel } = req.body;
    console.log('Received QR detection:', qrCode, action, clientTime, classLabel);

    if (!['timeIn', 'timeOut'].includes(action)) {
      return res.status(400).send('Invalid action');
    }

    let faceRecord = await Face.findOne({ label: qrCode });

    if (!faceRecord) {
      faceRecord = new Face({ label: qrCode, timeEntries: [] });
    }

    const clientMoment = moment(clientTime).tz('Asia/Phnom_Penh');
    console.log('Client time:', clientMoment.format());

    if (action === 'timeIn') {
      const existingEntry = faceRecord.timeEntries.find(
        entry => entry.classLabel === classLabel && !entry.timeOut
      );
      
      console.log('Existing entry for timeIn:', existingEntry);

      if (existingEntry) {
        return res.status(400).send('Already timed in for this class');
      }
      
      faceRecord.timeEntries.push({ timeIn: clientMoment.toDate(), classLabel });
      console.log('Added timeIn entry:', faceRecord.timeEntries);
    } else if (action === 'timeOut') {
      const lastEntry = faceRecord.timeEntries.find(
        entry => entry.classLabel === classLabel && !entry.timeOut
      );

      console.log('Last entry for timeOut:', lastEntry);

      if (lastEntry) {
        lastEntry.timeOut = clientMoment.toDate();
      } else {
        return res.status(400).send('No matching time in entry found for time out');
      }
      
      console.log('Updated timeOut entry:', faceRecord.timeEntries);
    }

    await faceRecord.save();
    req.app.get('io').emit('face-updated', { label: qrCode, action, time: clientMoment.toDate(), classLabel });
    res.status(201).send(`QR ${action} recorded successfully for ${classLabel}`);
  } catch (error) {
    console.error('Error saving QR data:', error);
    res.status(500).send('Error saving QR data');
  }
});

router.get('/attendance', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the start of the day
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Set to the start of the next day

    // Find all faces with timeEntries within the current day
    const faces = await Face.find({
      'timeEntries.timeIn': { $gte: today, $lt: tomorrow }
    });

    console.log('Retrieved faces:', faces); // Log retrieved faces

    const recordsByClass = {
      'Khmer Class (Full-Time)': [],
      'English Class (Full-Time)': [],
      'English Class (Part-Time)': [],
      'Office Hour (Part-Time)': []
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

// Route to display monthly attendance
// Route to display monthly attendance
router.get('/attendance/monthly', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7); // Default to the current month if not provided
    const [year, monthNumber] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNumber - 1, 1);
    const endOfMonth = new Date(year, monthNumber, 0, 23, 59, 59, 999);

    // Find all faces with timeEntries within the specified month
    const faces = await Face.find({
      'timeEntries.timeIn': { $gte: startOfMonth, $lt: endOfMonth }
    });

    const recordsByDay = {};
    const staffList = new Set();

    faces.forEach(face => {
      face.timeEntries.forEach(entry => {
        const timeIn = new Date(entry.timeIn);
        if (timeIn >= startOfMonth && timeIn < endOfMonth) {
          const day = timeIn.getDate();
          const label = face.label;

          if (!recordsByDay[label]) {
            recordsByDay[label] = {};
            staffList.add(label);
          }

          if (!recordsByDay[label][day]) {
            recordsByDay[label][day] = {
              timeIn: null,
              timeOut: null
            };
          }

          // Set timeIn and timeOut based on availability
          if (entry.timeIn) {
            recordsByDay[label][day].timeIn = entry.timeIn;
          }
          if (entry.timeOut) {
            recordsByDay[label][day].timeOut = entry.timeOut;
          }
        }
      });
    });

    res.render('./attendance/monthly', { recordsByDay, month, staffList: Array.from(staffList) });
  } catch (error) {
    console.error('Error retrieving face data:', error);
    res.status(500).send('Error retrieving face data');
  }
});



module.exports = router