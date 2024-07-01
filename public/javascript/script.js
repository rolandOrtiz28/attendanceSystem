const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const attendanceContainer = document.getElementById("attendance-container");
let faceMatcher;
let loader = document.getElementById("loader");
let detectedFace = null;
let lastRecognitionTime = 0;
const minConfidence = 0.6;
const recognitionCooldown = 3000;

const socket = io();

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
]).then(startWebcam);

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({
      video: { width: 640, height: 480 },
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
      video.play();
      if (loader) loader.style.display = "none";
    })
    .catch((error) => {
      console.error(error);
    });
}

async function getLabeledFaceDescriptions() {
  const labels = ["Roland Ortiz", "Jhea Dela Cruz", "An Phatsa", "Bunchhorn Bien", "Samrith Chanthy", "Ath Phyly", "Ath Sophaning", "Bouen Yuthakar", "Chen Nary", "Kong Pisey", "Melvin Dela Cruz", "Naim Bunna", "Ra Eiksreyka", "Sim Visal", "Sim Votey", "Sun Sophol", "Tes Kosal", "Yoeun Chamnab"];
  const descriptions = [];
  for (const label of labels) {
    const customerDescriptors = [];
    for (let i = 1; i <= 2; i++) {
      const img = await faceapi.fetchImage(./labels/${ label } / ${ i }.png);
      const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (detections && detections.descriptor) {
        const descriptor = detections.descriptor;
        const float32Descriptor = new Float32Array(descriptor);
        customerDescriptors.push(float32Descriptor);
      } else {
        console.log(No face detected for label ${ label } in image ${ i });
      }
    }
    descriptions.push(new faceapi.LabeledFaceDescriptors(label, customerDescriptors));
  }
  return descriptions;
}

document.getElementById('timeOutBtn').addEventListener('click', () => {
  if (detectedFace) {
    console.log('Time Out button clicked with detected face:', detectedFace.label);
    saveFaceDetection(detectedFace.label, 'timeOut');
  } else {
    console.log('No face detected to time out.');
  }
});

document.getElementById('timeIn').addEventListener('click', () => {
  if (detectedFace) {
    console.log('Time In button clicked with detected face:', detectedFace.label);
    saveFaceDetection(detectedFace.label, 'timeIn');
  } else {
    console.log('No face detected to time in.');
  }
});

async function saveFaceDetection(label, action) {
  try {
    const clientTime = new Date();
    console.log(Attempting to save face detection: ${ label }, Action: ${ action }, Client Time: ${ clientTime });
    const response = await fetch('/api/detect-face', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, action, clientTime }),
    });
    if (!response.ok) {
      console.error('Failed to send face detection data to server:', response.statusText);
    } else {
      console.log(Face ${ label } ${ action } saved successfully.);
    }
  } catch (error) {
    console.error('Error sending face detection data to server:', error);
  }
}

function updateAttendanceTable(faces) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tableHTML =
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
          .map(entry =>
            <tr>
              <td>
                <div class="d-flex align-items-center">
                  <div class="ms-3">
                    <p class="fw-bold mb-1">${face.label}</p>
                  </div>
                </div>
              </td>
              <td>
                <p class="fw-normal mb-1">${entry.classLabel}</p>
              </td>
              <td>
                ${entry.timeIn ? <p class="fw-normal mb-1">${new Date(entry.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p> : '<p class="fw-normal mb-1">N/A</p>'}
              </td>
              <td>
                ${entry.timeOut ? <p class="fw-normal mb-1">${new Date(entry.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p> : '<p class="fw-normal mb-1">N/A</p>'}
              </td>
            </tr>).join('')).join('')}
      </tbody>
    </table>
    ;
  attendanceContainer.innerHTML = tableHTML;
}

video.addEventListener("play", async () => {
  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.9);

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

        if (result.distance <= 0.7) {
          detectedFace = { label, box }; // Store the detected face
          console.log(Detected face: ${ label });
          lastRecognitionTime = Date.now();
        } else {
          console.log('Face detected but not recognized.');
        }

        const drawBox = new faceapi.draw.DrawBox(box, { label });
        drawBox.draw(canvas);
      }
    });
  }, 100);
});

socket.on("face-updated", ({ label, action, time, classLabel }) => {
  console.log(Received update from server: ${ label } ${ action } at ${ time } for ${ classLabel });
  fetch("/api/get-faces")
    .then(response => response.json())
    .then(data => updateAttendanceTable(data))
    .catch(error => console.error('Error fetching face data:', error));
});

function updateClock() {
  const now = new Date();
  const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  document.getElementById('clock').textContent = now.toLocaleTimeString('en-US', options);
}

setInterval(updateClock, 1000);

window.onload = function () {
  fetch("/api/get-faces")
    .then(response => response.json())
    .then(data => updateAttendanceTable(data))
    .catch(error => console.error('Error fetching face data:', error));
};
