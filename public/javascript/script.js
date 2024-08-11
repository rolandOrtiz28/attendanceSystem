const attendanceContainer = document.getElementById("attendance-container");
const qrReader = new Html5Qrcode("qr-reader");
let detectedQR = null;
let selectedAction = 'timeIn'; // Default value
let selectedClass = 'Khmer Class (Full-Time)'; // Default value

qrReader.start(
  { facingMode: "environment" }, // Use rear camera
  {
    fps: 15,    // Increase FPS to improve scanning performance
    qrbox: { width: 300, height: 300 }  // Adjust QR box size
  },
  qrCodeMessage => {
    detectedQR = qrCodeMessage;
    console.log(`Detected QR Code: ${qrCodeMessage}`);
    processQRDetection();
  },
  errorMessage => {
    console.log(`QR Code scanning error: ${errorMessage}`);
  }
);

document.addEventListener('DOMContentLoaded', () => {
  const qrReaderElement = document.getElementById("qr-reader");
  if (qrReaderElement) {
    qrReaderElement.style.transform = 'scaleX(-1)';
  }
});

let lastScannedQR = null;
let lastScannedTime = 0;
const COOLDOWN_PERIOD = 3000; // 3 seconds cooldown

function processQRDetection() {
  const currentTime = Date.now();

  if (detectedQR && (lastScannedQR !== detectedQR || (currentTime - lastScannedTime) > COOLDOWN_PERIOD)) {
    lastScannedQR = detectedQR;
    lastScannedTime = currentTime;
    saveQRDetection(detectedQR, selectedAction, selectedClass);
  } else {
    console.log('QR code already scanned recently, skipping.');
  }
}

async function saveQRDetection(qrCode, action, classLabel) {
  try {
    const response = await fetch('/api/detect-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode, action, classLabel }),
    });

    const responseText = await response.text(); // Read as text
    console.log('Server response:', responseText);

    // Since response is plain text, just log and skip JSON parsing
    fetchAttendanceData();
  } catch (error) {
    console.error(`Error sending QR detection data to server: ${error}`);
  }
}


async function fetchAttendanceData() {
  try {
    const response = await fetch('/api/get-faces');
    if (response.ok) {
      const faces = await response.json();
      console.log('Fetched faces:', faces);
      updateAttendanceTable(faces);
    } else {
      console.error('Failed to fetch attendance data');
    }
  } catch (error) {
    console.error('Error fetching attendance data:', error);
  }
}


function updateAttendanceTable(faces) {
  console.log('Updating table with data:', faces); // Check the received data

  const today = moment().tz('Asia/Phnom_Penh').startOf('day').toDate();
  const tomorrow = moment(today).add(1, 'day').toDate();
  console.log('Today:', today, 'Tomorrow:', tomorrow);

  const groupedEntries = {};
  faces.forEach(face => {
    face.timeEntries.forEach(entry => {
      const timeIn = moment(entry.timeIn).tz('Asia/Phnom_Penh').toDate();
      if (timeIn >= today && timeIn < tomorrow) {
        const classLabel = entry.classLabel;
        if (!groupedEntries[classLabel]) {
          groupedEntries[classLabel] = [];
        }
        groupedEntries[classLabel].push({
          label: face.label,
          timeIn: entry.timeIn ? moment(entry.timeIn).tz('Asia/Phnom_Penh').format('hh:mm:ss A') : 'N/A',
          timeOut: entry.timeOut ? moment(entry.timeOut).tz('Asia/Phnom_Penh').format('hh:mm:ss A') : 'N/A',
          timeInDate: entry.timeIn ? moment(entry.timeIn).tz('Asia/Phnom_Penh').format('M/D/YYYY') : 'N/A'
        });
      }
    });
  });

  console.log('Grouped Entries:', groupedEntries); // Check the grouped entries

  let tableHTML = '';
  for (const [classLabel, entries] of Object.entries(groupedEntries)) {
    tableHTML += `
      <h3 class="text-center mt-2">${classLabel}</h3>
      <table class="table align-middle mb-0 table-dark table-striped">
        <thead class="bg-light">
          <tr>
            <th>Name</th>
            <th>Class</th>
            <th>Time In</th>
            <th>Time Out</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(entry => `
            <tr>
              <td>${entry.label}</td>
              <td>${classLabel}</td>
              <td>${entry.timeIn}</td>
              <td>${entry.timeOut}</td>
              <td>${entry.timeInDate}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <br />
    `;
  }

  console.log('Generated Table HTML:', tableHTML); // Check the generated HTML
  attendanceContainer.innerHTML = tableHTML;
}


function updateClock() {
  const now = new Date();
  const dateString = now.toLocaleDateString();
  const timeString = now.toLocaleTimeString();

  document.getElementById('date').textContent = dateString;
  document.getElementById('clock').textContent = timeString;
}

setInterval(updateClock, 1000);

function autoSelectClass() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  if ((currentHour >= 1 && currentHour <= 11) || (currentHour === 11 && currentMinutes <= 59)) {
    selectedClass = 'Khmer Class (Full-Time)';
  } else if (currentHour >= 12 && currentHour <= 16 || (currentHour === 16 && currentMinutes <= 49)) {
    selectedClass = 'English Class (Full-Time)';
  } else if (currentHour >= 17 && currentHour <= 21 || (currentHour === 21 && currentMinutes <= 59)) {
    selectedClass = 'English Class (Part-Time)';
  } else {
    selectedClass = 'Khmer Class (Full-Time)';
  }

  document.querySelectorAll('.btn-class').forEach(button => {
    button.classList.remove('active');
    if (button.getAttribute('data-class') === selectedClass) {
      button.classList.add('active');
    }
  });

  console.log(`Auto-selected Class: ${selectedClass}`);
}

autoSelectClass();
setInterval(autoSelectClass, 60000);
