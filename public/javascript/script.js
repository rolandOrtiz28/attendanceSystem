const video = document.getElementById("video");
let faceMatcher; // Store the faceMatcher globally
let loader = document.getElementById("loader");


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
  const labels = ["Roland Ortiz", "Jhea Dela Cruz"];
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



let lastDetectedLabel = null;

let timeoutId = null;

const delay = 1000;


video.addEventListener("play", async () => {
  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.9);

  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);



    // Process the detections
    resizedDetections.forEach((detection, i) => {
      const descriptor = detection.descriptor;
const box = detection.detection.box;
      const result = faceMatcher.findBestMatch(descriptor);
      const label = result.toString().replace(/\s+\(.*?\)/, '');

const drawBox = new faceapi.draw.DrawBox(box, { label: label });
      drawBox.draw(canvas);

      lastDetectedLabel = label;

      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        fetch('/api/detect-face', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ label: lastDetectedLabel })
        });
        lastDetectedLabel = null;
      }, delay);
    });
  }, 100);
});