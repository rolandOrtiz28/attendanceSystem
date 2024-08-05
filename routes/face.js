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

router.post('/delete', async (req, res) => {
  try {
    await Face.deleteMany({});
    res.redirect('/attendance');
  } catch (error) {
    console.error('Error deleting faces:', error);
    res.status(500).send('Error deleting faces');
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

    // Convert client time to Asia/Phnom_Penh timezone
    const clientMoment = moment(clientTime).tz('Asia/Phnom_Penh');
    console.log('Client time:', clientMoment.format()); // Log client time for debugging

    if (action === 'timeIn') {
      // Find existing time-in entry for the same class and date
      const existingEntry = faceRecord.timeEntries.find(
        entry => entry.classLabel === classLabel &&
                 !entry.timeOut &&
                 moment(entry.timeIn).isSame(clientMoment, 'day')
      );

      console.log('Existing entry for timeIn:', existingEntry); // Log existing time-in entry

      if (existingEntry) {
        return res.status(400).send('Already timed in for this class today');
      }

      faceRecord.timeEntries.push({
        timeIn: clientMoment.toDate(),
        classLabel
      });

      console.log('Added timeIn entry:', faceRecord.timeEntries);
    } else if (action === 'timeOut') {
      // Find existing time-in entry for the same class and date
      const lastEntry = faceRecord.timeEntries.find(
        entry => entry.classLabel === classLabel &&
                 !entry.timeOut &&
                 moment(entry.timeIn).isSame(clientMoment, 'day')
      );

      console.log('Last entry for timeOut:', lastEntry); // Log last time-out entry

      if (lastEntry) {
        lastEntry.timeOut = clientMoment.toDate();
      } else {
        return res.status(400).send('No matching time-in entry found for time-out');
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




router.get('/attendance/monthly', async (req, res) => {
  try {
    const month = req.query.month || moment().format('YYYY-MM'); // Default to the current month if not provided
    const [year, monthNumber] = month.split('-').map(Number);
    const startOfMonth = moment.utc([year, monthNumber - 1]).startOf('month').toDate(); // Start of month in UTC
    const endOfMonth = moment.utc([year, monthNumber]).endOf('month').toDate(); // End of month in UTC

    // Find all faces with timeEntries within the specified month
    const faces = await Face.find({
      'timeEntries.timeIn': { $gte: startOfMonth, $lt: endOfMonth }
    });

    const recordsByClass = {
      'Khmer Class (Full-Time)': [],
      'English Class (Full-Time)': [],
      'English Class (Part-Time)': [],
      'Office Hour (Part-Time)': []
    };

    faces.forEach(face => {
      face.timeEntries.forEach(entry => {
        const timeIn = moment(entry.timeIn).tz('UTC').toDate(); // Convert to UTC
        const timeOut = entry.timeOut ? moment(entry.timeOut).tz('UTC').toDate() : null; // Convert to UTC
        if (timeIn >= startOfMonth && timeIn < endOfMonth) {
          if (entry.classLabel) {
            recordsByClass[entry.classLabel].push({
              label: face.label,
              timeIn: timeIn,
              timeOut: timeOut // May be null
            });
          }
        }
      });
    });

    res.render('./attendance/monthly', { recordsByClass, month });
  } catch (error) {
    console.error('Error retrieving face data:', error);
    res.status(500).send('Error retrieving face data');
  }
});


router.get('/attendance/personal/:label', async (req, res) => {
  try {
    const { label } = req.params;
    const { month } = req.query;

    console.log('Requested month:', month);

    const monthStart = new Date(month);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);

    console.log('Month Start:', monthStart);
    console.log('Month End:', monthEnd);

    const face = await Face.findOne({
      label,
      'timeEntries.timeIn': {
        $gte: monthStart,
        $lte: monthEnd
      }
    }).exec();

    if (!face) {
      return res.status(404).send('No records found');
    }

    // Group records by class
    const recordsByClass = face.timeEntries.reduce((acc, entry) => {
      if (!acc[entry.classLabel]) {
        acc[entry.classLabel] = [];
      }
      acc[entry.classLabel].push(entry);
      return acc;
    }, {});

    res.render('./attendance/personal', {
      label,
      month,
      recordsByClass
    });
  } catch (error) {
    console.error('Error retrieving personal record data:', error);
    res.status(500).send('Error retrieving personal record data');
  }
});


router.post('/api/update-time-entry', async (req, res) => {
  try {
    const { label, date, timeIn, timeOut, classLabel } = req.body;

    // Convert inputs to the appropriate formats
    const timeInDate = new Date(timeIn);
    const timeOutDate = timeOut ? new Date(timeOut) : null;
    const recordDate = new Date(date);

    // Find the face record by label
    const faceRecord = await Face.findOne({ label });

    if (!faceRecord) {
      return res.status(404).send('Face record not found');
    }

    // Find the specific time entry to update
    const entry = faceRecord.timeEntries.find(
      e => e.classLabel === classLabel &&
           moment(e.timeIn).isSame(recordDate, 'day')
    );

    if (!entry) {
      return res.status(404).send('Time entry not found');
    }

    // Update timeIn and/or timeOut
    entry.timeIn = timeInDate;
    entry.timeOut = timeOutDate;

    await faceRecord.save();
    res.status(200).send('Time entry updated successfully');
  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).send('Error updating time entry');
  }
});

module.exports = router