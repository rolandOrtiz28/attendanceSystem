const attendanceContainer = document.getElementById("attendance-container");
const qrReader = new Html5Qrcode("qr-reader");
let detectedQR = null;
let selectedAction = 'timeIn'; // Default value
let selectedClass = 'auto'; // Default value as auto

// Initialize QR code reader
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

// Adjust QR reader element
document.addEventListener('DOMContentLoaded', () => {
  const qrReaderElement = document.getElementById("qr-reader");
  if (qrReaderElement) {
    qrReaderElement.style.transform = 'scaleX(-1)';
  }
});

// Prevent rapid re-scanning
let lastScannedQR = null;
let lastScannedTime = 0;
const COOLDOWN_PERIOD = 3000; // 3 seconds cooldown

function processQRDetection() {
  const currentTime = Date.now();

  if (detectedQR && (lastScannedQR !== detectedQR || (currentTime - lastScannedTime) > COOLDOWN_PERIOD)) {
    lastScannedQR = detectedQR;
    lastScannedTime = currentTime;
    console.log(`Processing QR code: ${detectedQR} with action: ${selectedAction} and class: ${selectedClass}`);
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

    // Display success message with class information
    showSuccessMessage(`${qrCode} has successfully ${action}ed`, classLabel);
    
    // Fetch updated attendance data
    fetchAttendanceData();
  } catch (error) {
    console.error(`Error sending QR detection data to server: ${error}`);
  }
}
function showSuccessMessage(message, classLabel) {
  const successMessageElement = document.getElementById('success-message');
  successMessageElement.textContent = `${message} for ${classLabel}`;
  successMessageElement.style.display = 'block';

  // Remove the fade-out class after 2 seconds
  setTimeout(() => {
    successMessageElement.classList.add('fade-out');
    // Hide the element after fading out
    setTimeout(() => {
      successMessageElement.style.display = 'none';
      successMessageElement.classList.remove('fade-out');
    }, 1000); // Duration of the fade-out effect
  }, 2000); // Duration to display the message
}
async function fetchAttendanceData() {
  try {
    const response = await fetch('/api/get-faces');
    if (response.ok) {
      const faces = await response.json();
      console.log('Fetched faces:', faces);
      // No table update needed; we are showing success messages instead
    } else {
      console.error('Failed to fetch attendance data');
    }
  } catch (error) {
    console.error('Error fetching attendance data:', error);
  }
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

  // Only auto-select if no class is selected manually
  if (selectedClass === 'auto') {
    if ((currentHour >= 1 && currentHour <= 11) || (currentHour === 11 && currentMinutes <= 59)) {
      selectedClass = 'Khmer Class (Full-Time)';
    } else if (currentHour >= 12 && currentHour <= 16 || (currentHour === 16 && currentMinutes <= 49)) {
      selectedClass = 'English Class (Full-Time)';
    } else if (currentHour >= 17 && currentHour <= 21 || (currentHour === 21 && currentMinutes <= 59)) {
      selectedClass = 'English Class (Part-Time)';
    } else {
      selectedClass = 'Khmer Class (Full-Time)';
    }
  }

  // Update button states
  document.querySelectorAll('.btn-class').forEach(button => {
    button.classList.remove('active');
    if (button.getAttribute('data-class') === selectedClass) {
      button.classList.add('active');
    }
  });

  console.log(`Auto-selected Class: ${selectedClass}`);
}

// Initialize auto-class selection
autoSelectClass();
setInterval(autoSelectClass, 60000);

// Event listeners for button clicks
document.querySelectorAll('.btn[data-action]').forEach(button => {
  button.addEventListener('click', (event) => {
    selectedAction = event.target.getAttribute('data-action');
    // Update button states
    document.querySelectorAll('.btn[data-action]').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');
    console.log(`Selected action: ${selectedAction}`);
  });
});

document.querySelectorAll('.btn-class').forEach(button => {
  button.addEventListener('click', (event) => {
    selectedClass = event.target.getAttribute('data-class');
    console.log(`Selected class: ${selectedClass}`);
    // Call autoSelectClass to ensure the UI reflects the selected class
    autoSelectClass();
  });
});
