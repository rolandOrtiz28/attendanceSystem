// Ensure attendanceContainer is defined
const attendanceContainer = document.getElementById("attendance-container");

const qrReader = new Html5Qrcode("qr-reader");
let detectedQR = null;

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
    const actionSelect = document.getElementById('actionSelect').value;
    const classSelect = document.getElementById('classSelect').value;
    saveQRDetection(detectedQR, actionSelect, classSelect);
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
      console.error(`Failed to send QR detection data to server: ${errorText}`);
    }
  } catch (error) {
    console.error(`Error sending QR detection data to server: ${error}`);
  }
}


// Function to update the attendance table
function updateAttendanceTable(faces) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
        ${faces.map(face => face.timeEntries
    .filter(entry => new Date(entry.timeIn).setHours(0, 0, 0, 0) === today.getTime())
    .map(entry => `
            <tr>
              <td>${face.label}</td>
              <td>${entry.classLabel}</td>
              <td>${entry.timeIn ? new Date(entry.timeIn).toLocaleTimeString() : 'N/A'}</td>
              <td>${entry.timeOut ? new Date(entry.timeOut).toLocaleTimeString() : 'N/A'}</td>
            </tr>`).join('')).join('')}
      </tbody>
    </table>
  `;
  attendanceContainer.innerHTML = tableHTML;
}

function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}

setInterval(updateClock, 1000);

window.onload = function () {
  fetch("/api/get-faces")
    .then(response => response.json())
    .then(data => updateAttendanceTable(data))
    .catch(error => console.error('Error fetching face data:', error));
};

// Socket.io integration for real-time updates
const socket = io();

socket.on('face-updated', data => {
  console.log('Real-time update received:', data);
  fetch("/api/get-faces")
    .then(response => response.json())
    .then(data => updateAttendanceTable(data))
    .catch(error => console.error('Error fetching face data:', error));
});
