const video = document.getElementById("video");
let faceMatcher; // Store the faceMatcher globally
let loader = document.getElementById("loader");
const recognizedFaces = new Set(); // Store recognized faces

const minConfidence = 0.6; // Define minConfidence here

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
]).then(startWebcam);

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({
      video: {
        width: 640,
        height: 480,
      },
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
      video.play();
      loader.style.display = "none";
    })
    .catch((error) => {
      console.error(error);
    });
}

async function getLabeledFaceDescriptions() {
  const labels = ["Roland Ortiz", "Jhea Dela Cruz", "Chean Bunleap", "Chhin Sokunkhenna", "Khaing Meying", "Phan Phanith", "Saoheng Sovannary"];
  const descriptions = [];
  for (const label of labels) {
    const customerDescriptors = []; // Array to store descriptors for each customer
    for (let i = 1; i <= 2; i++) {
      const img = await faceapi.fetchImage(`./labels/${label}/${i}.png`);
      const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (detections && detections.descriptor) {
        const descriptor = detections.descriptor;
        // Convert descriptor to Float32Array
        const float32Descriptor = new Float32Array(descriptor);
        customerDescriptors.push(float32Descriptor);
      } else {
        console.log(`No face detected for label ${label} in image ${i}`);
      }
    }
    // Push the descriptors array for the current customer
    descriptions.push(new faceapi.LabeledFaceDescriptors(label, customerDescriptors));
  }
  return descriptions;
}

// video.addEventListener("play", async () => {
//   const labeledFaceDescriptors = await getLabeledFaceDescriptions();
//   faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.9);

//   const canvas = faceapi.createCanvasFromMedia(video);
//   document.body.append(canvas);

//   const displaySize = { width: video.width, height: video.height };
//   faceapi.matchDimensions(canvas, displaySize);

//   setInterval(async () => {
//     const detections = await faceapi
//       .detectAllFaces(video)
//       .withFaceLandmarks()
//       .withFaceDescriptors();

//     const resizedDetections = faceapi.resizeResults(detections, displaySize);

//     canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

//     resizedDetections.forEach((detection, i) => {
//       // Check if the detection confidence is above the threshold
//       if (detection.detection.score >= minConfidence) {
//         const descriptor = detection.descriptor;
//         const box = detection.detection.box;
//         const result = faceMatcher.findBestMatch(descriptor);
//         const label = result.toString().replace(/\s+\(.*?\)/, '');

//         // Check if this label has been recognized before
//         if (!recognizedFaces.has(label)) {
//           // If not, add it to recognizedFaces set
//           recognizedFaces.add(label);

//           // Send the detection to the server only if it's a known person
//           if (label !== "unknown") {
//             fetch('/api/detect-face', {
//               method: 'POST',
//               headers: {
//                 'Content-Type': 'application/json'
//               },
//               body: JSON.stringify({ label, box })
//             })
//             .then(response => {
//               if (!response.ok) {
//                 console.error('Failed to send face detection data to server:', response.statusText);
//               }
//             })
//             .catch(error => {
//               console.error('Error sending face detection data to server:', error);
//             });
//           }
//         }

//         const drawBox = new faceapi.draw.DrawBox(box, { label: label });
//         drawBox.draw(canvas);
//       } else {
//         // If confidence is below threshold, label as "unknown"
//         const box = detection.detection.box;
//         const label = "unknown";
//         const drawBox = new faceapi.draw.DrawBox(box, { label: label });
//         drawBox.draw(canvas);
//       }
//     });
//   }, 100);
// });

video.addEventListener("play", async () => {
  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.9);

  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  let lastRecognitionTime = 0; // Variable to store the timestamp of the last recognition

  setInterval(async () => {
    const currentTime = Date.now();
    const timeSinceLastRecognition = currentTime - lastRecognitionTime;

    // Wait for 3 seconds before allowing another recognition
    if (timeSinceLastRecognition < 3000) {
      return;
    }

    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    resizedDetections.forEach((detection, i) => {
      // Check if the detection confidence is above the threshold
      if (detection.detection.score >= minConfidence) {
        const descriptor = detection.descriptor;
        const box = detection.detection.box;
        const result = faceMatcher.findBestMatch(descriptor);
        const label = result.toString().replace(/\s+\(.*?\)/, '');

        // Check if this label has been recognized before
        if (!recognizedFaces.has(label)) {
          // If not, add it to recognizedFaces set
          recognizedFaces.add(label);

          // Send the detection to the server only if it's a known person
          if (result.distance <= 0.5) { // Adjust this threshold as needed
            fetch('/api/detect-face', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ label, box })
            })
            .then(response => {
              if (!response.ok) {
                console.error('Failed to send face detection data to server:', response.statusText);
              }
            })
            .catch(error => {
              console.error('Error sending face detection data to server:', error);
            });

            // Update the timestamp of the last recognition
            lastRecognitionTime = Date.now();
          }
        }

        const drawBox = new faceapi.draw.DrawBox(box, { label: label });
        drawBox.draw(canvas);
      } else {
        // If confidence is below threshold, label as "unknown"
        const box = detection.detection.box;
        const label = "unknown";
        const drawBox = new faceapi.draw.DrawBox(box, { label: label });
        drawBox.draw(canvas);
      }
    });
  }, 100);
});
