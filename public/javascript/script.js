// Ensure attendanceContainer is defined
const attendanceContainer = document.getElementById("attendance-container");
const qrReader = new Html5Qrcode("qr-reader");
let detectedQR = null;
let selectedAction = 'timeIn'; // Default value
let selectedClass = 'Khmer Class (Full-Time)'; // Default value

// QR Code scanning configuration
qrReader.start(
  { facingMode: "environment" }, // Use rear camera
  {
    fps: 10,    // Frame-per-second for the scanning
    qrbox: { width: 250, height: 250 }  // Set the QR box size
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

function processQRDetection() {
  if (detectedQR) {
    saveQRDetection(detectedQR, selectedAction, selectedClass);
  } else {
    console.log('No QR code detected to process.');
  }
}

async function saveQRDetection(qrCode, action, classLabel) {
  const clientTime = new Date();
  try {
    const response = await fetch('/api/detect-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode, action, clientTime, classLabel }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${errorText}`);
    }
  } catch (error) {
    console.error(`Error sending QR detection data to server: ${error}`);
  }
}

function updateAttendanceTable(faces) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to the start of the day


console.log(`Current Time: ${currentHour}:${currentMinutes}`);
  // Define time ranges for class periods
  const timeRanges = {
    'Khmer Class (Full-Time)': { start: 6, end: 11, endMinutes: 59 },
    'Office Hour (Part-Time)': { start: 6, end: 11, endMinutes: 59 },
    'English Class (Full-Time)': { start: 12, end: 16, endMinutes: 59 },
    'English Class (Part-Time)': { start: 17, end: 21, endMinutes: 59 }
  };
console.log('Time Ranges:', JSON.stringify(timeRanges, null, 2));
  let filteredEntries = [];
  let selectedClass = '';

  // Determine the current class period based on time
  for (const [classLabel, range] of Object.entries(timeRanges)) {
    if (
      (currentHour > range.start && currentHour < range.end) ||
      (currentHour === range.end && currentMinutes <= range.endMinutes)
    ) {
      selectedClass = classLabel;
      break;
    }
  }

  console.log(`Selected Class: ${selectedClass}`); // Debugging: Check selected class

  if (selectedClass) {
    filteredEntries = faces.flatMap(face => face.timeEntries
      .filter(entry => entry.classLabel === selectedClass &&
        new Date(entry.timeIn).setHours(0, 0, 0, 0) === today.getTime())
      .map(entry => ({
        label: face.label,
        classLabel: entry.classLabel,
        timeIn: entry.timeIn,
        timeOut: entry.timeOut
      }))
    );
  }
console.log('Filtered Entries:', JSON.stringify(filteredEntries, null, 2));
  const tableHTML = `
    <table class="table align-middle mb-0 table-dark table-striped">
      <thead class="bg-light">
        <tr>
          <th>Name</th>
          <th>Class</th>
          <th>Time In</th>
          <th>Time Out</th>
        </tr>
      </thead>
      <tbody>
        ${filteredEntries.map(entry => `
            <tr>
              <td>${entry.label}</td>
              <td>${entry.classLabel}</td>
              <td>${entry.timeIn ? new Date(entry.timeIn).toLocaleTimeString() : 'N/A'}</td>
              <td>${entry.timeOut ? new Date(entry.timeOut).toLocaleTimeString() : 'N/A'}</td>
            </tr>`).join('')}
      </tbody>
    </table>
  `;
console.log('Generated Table HTML:', tableHTML);
  attendanceContainer.innerHTML = tableHTML;
}


function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}

setInterval(updateClock, 1000);

// Function to auto-select the class based on the current time
function autoSelectClass() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  if ((currentHour >= 6 && currentHour <= 11) || (currentHour === 11 && currentMinutes <= 59)) {
    selectedClass = 'Khmer Class (Full-Time)';
  } else if (currentHour >= 12 && currentHour <= 16 || (currentHour === 16 && currentMinutes <= 49)) {
    selectedClass = 'English Class (Full-Time)';
  } else if (currentHour >= 17 && currentHour <= 21 || (currentHour === 21 && currentMinutes <= 59)) {
    selectedClass = 'English Class (Part-Time)';
  } else {
    selectedClass = 'Khmer Class (Full-Time)'; // Default fallback
  }

  document.querySelectorAll('.btn-class').forEach(button => {
    button.classList.remove('active');
    if (button.getAttribute('data-class') === selectedClass) {
      button.classList.add('active');
    }
  });

  console.log(`Auto-selected Class: ${selectedClass}`);
}

// Handle button clicks for action and class selection
document.addEventListener('DOMContentLoaded', () => {
  // Auto-select the class on page load
  autoSelectClass();

  document.querySelectorAll('.btn-group button').forEach(button => {
    button.addEventListener('click', (event) => {
      const action = event.target.getAttribute('data-action');
      const classLabel = event.target.getAttribute('data-class');

      if (action) {
        selectedAction = action;
        document.querySelectorAll('[data-action]').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        console.log(`Selected Action: ${selectedAction}`);
      } else if (classLabel) {
        selectedClass = classLabel;
        document.querySelectorAll('[data-class]').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        console.log(`Selected Class: ${selectedClass}`);
      }
    });
  });

  // Fetch initial face data
  fetch("/api/get-faces")
    .then(response => response.json())
    .then(data => updateAttendanceTable(data))
    .catch(error => console.error('Error fetching face data:', error));

  // Socket.io integration for real-time updates
  const socket = io();

  socket.on('face-updated', data => {
    console.log('Real-time update received:', data);
    fetch("/api/get-faces")
      .then(response => response.json())
      .then(data => updateAttendanceTable(data))
      .catch(error => console.error('Error fetching face data:', error));
  });
});
