// ROUTE:
const express = require("express");
const router = express.Router();
const Face = require('../Model/face');
const moment = require('moment-timezone');

// Set the time zone
const TIMEZONE = 'Asia/Phnom_Penh';

router.get('/loginface', (req, res) => {
    res.render('home/loginface');
});

// router.get('/api/get-faces', async (req, res) => {
//     try {
//         const clientMoment = moment().tz(TIMEZONE);

//         // Correct the start of the day
//         const todayStart = clientMoment.startOf('day').toDate();
//         const tomorrowStart = moment(todayStart).add(1, 'day').toDate();

//         const faces = await Face.find({
//             'timeEntries.timeIn': { $gte: todayStart, $lt: tomorrowStart }
//         });

//         const filteredFaces = faces.map(face => ({
//             label: face.label,
//             timeEntries: face.timeEntries.filter(entry => {
//                 const timeIn = moment(entry.timeIn).tz(TIMEZONE);
//                 return timeIn.isSame(todayStart, 'day');
//             })
//         }));

//         res.json(filteredFaces);
//     } catch (error) {
//         console.error('Error fetching face data:', error);
//         res.status(500).send('Error fetching face data');
//     }
// });
router.get('/api/get-faces', async (req, res) => {
    try {
        const clientMoment = moment().tz(TIMEZONE);

        // Correct the start of the day
        const todayStart = clientMoment.startOf('day').toDate();
        const tomorrowStart = moment(todayStart).add(1, 'day').toDate();

        const faces = await Face.find({
            'timeEntries.timeIn': { $gte: todayStart, $lt: tomorrowStart }
        });

        const filteredFaces = faces.map(face => ({
            label: face.label,
            timeEntries: face.timeEntries.filter(entry => {
                const timeIn = moment(entry.timeIn).tz(TIMEZONE);
                // Adjust timeIn if between 12 AM and 6 AM
                if (timeIn.hour() < 6) {
                    timeIn.add(1, 'day');
                }
                return timeIn.isSame(todayStart, 'day');
            })
        }));

        res.json(filteredFaces);
    } catch (error) {
        console.error('Error fetching face data:', error);
        res.status(500).send('Error fetching face datas');
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

// router.post('/api/detect-qr', async (req, res) => {
//     try {
//         const { qrCode, action, classLabel } = req.body;

//         if (!['timeIn', 'timeOut'].includes(action)) {
//             return res.status(400).send('Invalid action');
//         }

//         let faceRecord = await Face.findOne({ label: qrCode });

//         if (!faceRecord) {
//             faceRecord = new Face({ label: qrCode, timeEntries: [] });
//         }

//         const clientMoment = moment().tz(TIMEZONE);

//         // Debugging: Log the current moment
//         console.log(`Current Time for QR code: ${clientMoment.format()}`);

//         if (action === 'timeIn') {
//             const existingEntry = faceRecord.timeEntries.find(
//                 entry => entry.classLabel === classLabel &&
//                     !entry.timeOut &&
//                     moment(entry.timeIn).tz(TIMEZONE).isSame(clientMoment, 'day')
//             );

//             if (existingEntry) {
//                 return res.status(400).send('Already timed in for this class today');
//             }

//             faceRecord.timeEntries.push({
//                 timeIn: clientMoment.toDate(),
//                 classLabel
//             });

//         } else if (action === 'timeOut') {
//             const lastEntry = faceRecord.timeEntries.find(
//                 entry => entry.classLabel === classLabel &&
//                     !entry.timeOut &&
//                     moment(entry.timeIn).tz(TIMEZONE).isSame(clientMoment, 'day')
//             );

//             if (lastEntry) {
//                 lastEntry.timeOut = clientMoment.toDate();
//             } else {
//                 return res.status(400).send('No matching time-in entry found for time-out');
//             }
//         }

//         await faceRecord.save();
//         req.app.get('io').emit('face-updated', { label: qrCode, action, time: clientMoment.toDate(), classLabel });
//         res.status(201).send(`QR ${action} recorded successfully for ${classLabel}`);
//     } catch (error) {
//         console.error('Error saving QR data:', error);
//         res.status(500).send('Error saving QR data');
//     }
// });
router.post('/api/detect-qr', async (req, res) => {
    try {
        const { qrCode, action, classLabel } = req.body;

        if (!['timeIn', 'timeOut'].includes(action)) {
            return res.status(400).send('Invalid action');
        }

        let faceRecord = await Face.findOne({ label: qrCode });

        if (!faceRecord) {
            faceRecord = new Face({ label: qrCode, timeEntries: [] });
        }

        const clientMoment = moment().tz(TIMEZONE);

        // Adjust the time if between 12 AM and 6 AM
        if (clientMoment.hour() < 6) {
            clientMoment.add(1, 'day');
        }

        if (action === 'timeIn') {
            const existingEntry = faceRecord.timeEntries.find(
                entry => entry.classLabel === classLabel &&
                    !entry.timeOut &&
                    moment(entry.timeIn).tz(TIMEZONE).isSame(clientMoment, 'day')
            );

            if (existingEntry) {
                return res.status(400).send('Already timed in for this class today');
            }

            faceRecord.timeEntries.push({
                timeIn: clientMoment.toDate(),
                classLabel
            });

        } else if (action === 'timeOut') {
            const lastEntry = faceRecord.timeEntries.find(
                entry => entry.classLabel === classLabel &&
                    !entry.timeOut &&
                    moment(entry.timeIn).tz(TIMEZONE).isSame(clientMoment, 'day')
            );

            if (lastEntry) {
                lastEntry.timeOut = clientMoment.toDate();
            } else {
                return res.status(400).send('No matching time-in entry found for time-out');
            }
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
        const now = moment().tz(TIMEZONE);
        const today = now.startOf('day').toDate();
        const tomorrow = now.add(1, 'day').startOf('day').toDate();

        // Adjust today and tomorrow for time between 12 AM and 6 AM
        const adjustedToday = now.clone().startOf('day').toDate();
        const adjustedTomorrow = now.clone().add(1, 'day').startOf('day').toDate();
        
        const faces = await Face.find({
            'timeEntries.timeIn': { $gte: adjustedToday, $lt: adjustedTomorrow }
        });

        const recordsByClass = {
            'Khmer Class (Full-Time)': [],
            'English Class (Full-Time)': [],
            'English Class (Part-Time)': [],
            'Office Hour (Part-Time)': []
        };

        faces.forEach(face => {
            face.timeEntries.forEach(entry => {
                const timeIn = moment(entry.timeIn).tz(TIMEZONE).toDate();
                const timeOut = moment(entry.timeOut).tz(TIMEZONE).toDate();

                // Adjust timeIn and timeOut if they fall between 12 AM and 6 AM
                if (timeIn >= today && timeIn < tomorrow) {
                    if (moment(timeIn).hour() >= 0 && moment(timeIn).hour() < 6) {
                        timeIn = moment(timeIn).add(1, 'day').toDate();
                    }
                    if (moment(timeOut).hour() >= 0 && moment(timeOut).hour() < 6) {
                        timeOut = moment(timeOut).add(1, 'day').toDate();
                    }

                    if (entry.classLabel) {
                        recordsByClass[entry.classLabel].push({
                            label: face.label,
                            timeIn,
                            timeOut
                        });
                    }
                }
            });
        });

        res.render('./attendance/index', { recordsByClass, currentDate: now.toDate() });
    } catch (error) {
        console.error('Error retrieving face data:', error);
        res.status(500).send('Error retrieving face data');
    }
});


router.get('/attendance/monthly', async (req, res) => {
    try {
        const month = req.query.month || moment().tz(TIMEZONE).format('YYYY-MM');
        const [year, monthNumber] = month.split('-').map(Number);
        const startOfMonth = moment.tz([year, monthNumber - 1], TIMEZONE).startOf('month').toDate();
        const endOfMonth = moment.tz([year, monthNumber - 1], TIMEZONE).endOf('month').toDate();

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
                const timeIn = moment(entry.timeIn).tz(TIMEZONE).toDate();
                const timeOut = entry.timeOut ? moment(entry.timeOut).tz(TIMEZONE).toDate() : null;
                if (timeIn >= startOfMonth && timeIn < endOfMonth) {
                    if (entry.classLabel) {
                        recordsByClass[entry.classLabel].push({
                            label: face.label,
                            timeIn: timeIn,
                            timeOut: timeOut
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

        const monthStart = moment(month).tz(TIMEZONE).startOf('month').toDate();
        const monthEnd = moment(month).tz(TIMEZONE).endOf('month').toDate();

        const face = await Face.findOne({
            label,
            'timeEntries.timeIn': { $gte: monthStart, $lte: monthEnd }
        }).exec();

        if (!face) {
            return res.status(404).send('No records found');
        }

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

        const timeInDate = moment(timeIn).tz(TIMEZONE).toDate();
        const timeOutDate = timeOut ? moment(timeOut).tz(TIMEZONE).toDate() : null;
        const recordDate = moment(date).tz(TIMEZONE).startOf('day').toDate();

        const faceRecord = await Face.findOne({ label });

        if (!faceRecord) {
            return res.status(404).send('Face record not found');
        }

        const entry = faceRecord.timeEntries.find(
            e => e.classLabel === classLabel &&
                moment(e.timeIn).tz(TIMEZONE).isSame(recordDate, 'day')
        );

        if (!entry) {
            return res.status(404).send('Time entry not found');
        }

        entry.timeIn = timeInDate;
        entry.timeOut = timeOutDate;

        await faceRecord.save();
        res.status(200).send('Time entry updated successfully');
    } catch (error) {
        console.error('Error updating time entry:', error);
        res.status(500).send('Error updating time entry');
    }
});

module.exports = router;
