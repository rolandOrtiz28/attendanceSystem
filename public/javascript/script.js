const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const attendanceContainer = document.getElementById("attendance-container");
let faceMatcher;
let detectedFace = null;
let lastRecognitionTime = 0;
const minConfidence = 0.5;
const recognitionCooldown = 5000; // Increased cooldown to reduce processing frequency
const displaySize = { width: 320, height: 240 }; // Reduced video resolution for performance

const socket = io();

async function loadModels() {
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  ]);
  startWebcam();
}

async function startWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: displaySize, // Use reduced resolution
    audio: false,
  });
  video.srcObject = stream;
  video.play();
}

async function getLabeledFaceDescriptions() {
  const labels = ["Roland Ortiz", "Jhea Dela Cruz", "An Phatsa", "Bunchhorn Bien", "Samrith Chanthy", "Ath Phyly", "Ath Sophaning", "Bouen Yuthakar", "Chen Nary", "Kong Pisey", "Naim Bunna", "Ra Eiksreyka", "Sim Visal", "Sim Votey", "Sun Sophol", "Tes Kosal", "Yoeun Chamnab", "Melvin Dela Cruz"];
  const descriptions = [];
  for (const label of labels) {
    const customerDescriptors = [];
    for (let i = 1; i <= 2; i++) {
      const img = await faceapi.fetchImage(`./labels/${label}/${i}.png`);
      const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (detections && detections.descriptor) {
        const descriptor = detections.descriptor;
        const float32Descriptor = new Float32Array(descriptor);
        customerDescriptors.push(float32Descriptor);
      } else {
        console.log(`No face detected for label ${label} in image ${i}`);
        console.log("No face");
      }
    }
    descriptions.push(new faceapi.LabeledFaceDescriptors(label, customerDescriptors));
  }
  return descriptions;
}

document.getElementById('timeOutBtn').addEventListener('click', () => {
  if (detectedFace) {
    console.log(`Time Out button clicked with detected face: ${detectedFace.label}`);
    saveFaceDetection(detectedFace.label, 'timeOut');
  } else {
    console.log('No face detected to time out.');
  }
});

document.getElementById('timeIn').addEventListener('click', () => {
  if (detectedFace) {
    console.log(`Time In button clicked with detected face: ${detectedFace.label}`);
    saveFaceDetection(detectedFace.label, 'timeIn');
  } else {
    console.log('No face detected to time in.');
  }
});

async function saveFaceDetection(label, action) {
  const clientTime = new Date();
  try {
    const response = await fetch('/api/detect-face', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, action, clientTime }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send face detection data to server:', errorText);
    }
  } catch (error) {
    console.error('Error sending face detection data to server:', error);
  }
}

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

video.addEventListener("play", async () => {
  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const currentTime = Date.now();
    const timeSinceLastRecognition = currentTime - lastRecognitionTime;
  
    if (timeSinceLastRecognition < recognitionCooldown) {
      return;
    }
  
    const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
  
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  
    resizedDetections.forEach((detection) => {
      if (detection.detection.score >= minConfidence) {
        const descriptor = detection.descriptor;
        const box = detection.detection.box;
        const result = faceMatcher.findBestMatch(descriptor);
        const label = result.toString().replace(/\s+\(.*?\)/, '');
  
        if (result.distance <= 0.6) { // Adjust this value
          detectedFace = { label, box }; // Store the detected face
          console.log(`Detected face: ${label}`);
          lastRecognitionTime = Date.now();
        } else {
          console.log('Face detected but not recognized.');
        }
  
        const drawBox = new faceapi.draw.DrawBox(box, { label });
        drawBox.draw(canvas);
      }
    });
  }, 200); 
});

socket.on("face-updated", () => {
  fetch("/api/get-faces")
    .then(response => response.json())
    .then(data => updateAttendanceTable(data))
    .catch(error => console.error('Error fetching face data:', error));
});

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

loadModels();
