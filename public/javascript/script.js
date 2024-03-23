const video = document.getElementById("video");

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
]).then(startWebcam);

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error(error);
    });
}

function getLabeledFaceDescriptions() {
  const labels = ["Roland Ortiz", "Papa", "Jhea Dela Cruz", "Melvin Dela Cruz"];
  return Promise.all(
    labels.map(async (label) => {
      const descriptions = [];
      for (let i = 1; i <= 2; i++) {
        const img = await faceapi.fetchImage(`./labels/${label}/${i}.png`);
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();

        // Check if a face was detected and a valid descriptor exists
        if (detections && detections.descriptor) {
          descriptions.push(detections.descriptor);
        } else {
          console.log(`No face detected for label ${label} in image ${i}`);
        }
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

// video.addEventListener("play", async () => {
//     const labeledFaceDescriptors = await getLabeledFaceDescriptions();
//     const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

//     const canvas = faceapi.createCanvasFromMedia(video);
//     document.body.append(canvas);

//     const displaySize = { width: video.width, height: video.height };
//     faceapi.matchDimensions(canvas, displaySize);

//     // Object to store the last detection time for each label
//     const lastDetectionTimes = {};

//     setInterval(async () => {
//         const detections = await faceapi
//             .detectAllFaces(video)
//             .withFaceLandmarks()
//             .withFaceDescriptors();

//         const resizedDetections = faceapi.resizeResults(detections, displaySize);

//         canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

//         const results = resizedDetections.map((d) => {
//             return faceMatcher.findBestMatch(d.descriptor);
//         });

//         results.forEach(async (result, i) => {
//             const label = result._label;

//             // Get the current time
//             const currentTime = Date.now();

//             // Get the last detection time for this label
//             const lastDetectionTime = lastDetectionTimes[label] || 0;

//             // Calculate the time difference since the last detection
//             const timeSinceLastDetection = currentTime - lastDetectionTime;

//             // Check if the time difference exceeds the threshold
//             const detectionThreshold = 5000; // Adjust this threshold as needed (in milliseconds)
//             if (timeSinceLastDetection > detectionThreshold) {
//                 // Update the last detection time for this label
//                 lastDetectionTimes[label] = currentTime;

//                 const box = resizedDetections[i].detection.box;
//                 const drawBox = new faceapi.draw.DrawBox(box, {
//                     label: label,
//                 });
//                 drawBox.draw(canvas);

//                 console.log("Detected label:", label);

//                 // Send detected face data to the server
//                 await fetch('/api/detect-face', {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json'
//                     },
//                     body: JSON.stringify({ label: label })
//                 });
//             } else {
//                 console.log("Detection for label", label, "too frequent, ignoring");
//             }
//         });
//     }, 100);
// });

video.addEventListener("play", async () => {
    const labeledFaceDescriptors = await getLabeledFaceDescriptions();
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    // Object to store the last detected time for each face
    const lastDetectionTimes = {};

    // Confidence threshold for face recognition
    const confidenceThreshold = 0.6;

    setInterval(async () => {
        const detections = await faceapi
            .detectAllFaces(video)
            .withFaceLandmarks()
            .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        const results = resizedDetections.map((d) => {
            return faceMatcher.findBestMatch(d.descriptor);
        });

        results.forEach(async (result, i) => {
            const label = result._label;
            const confidence = result._distance;

            // Check if the label is "unknown" or confidence level is below threshold
            if (label !== 'unknown' && confidence < confidenceThreshold &&
                (!lastDetectionTimes[label] || Date.now() - lastDetectionTimes[label] >= 3 * 60 * 60 * 1000)) {
                lastDetectionTimes[label] = Date.now();

                const box = resizedDetections[i].detection.box;
                const drawBox = new faceapi.draw.DrawBox(box, {
                    label: label,
                });
                drawBox.draw(canvas);

                console.log("Detected label:", label, "with confidence:", confidence);

                // Send detected face data to the server
                await fetch('/api/detect-face', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ label: label })
                });
            }
        });
    }, 100);
});
