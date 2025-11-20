let seed;
let cubes = [];
let cam;
let handpose;
let predictions = [];

let rotX = 0;
let rotY = 0;
let zoom = 800;
let targetRotX = 0;
let targetRotY = 0;
let targetZoom = 800;

let colors = [];
let currentColorMode = 0;
let modelReady = false;
let camReady = false;

// Performance optimization
let lastHandUpdate = 0;
const HAND_UPDATE_INTERVAL = 100;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  frameRate(60);
  
  // Initialize colors
  initializeColors();
  
  // Generate initial cubes
  generateCubes();
  
  // Setup webcam and hand tracking
  setupHandTracking();
}

function initializeColors() {
  colors = [
    ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEAA7', '#A29BFE'],
    ['#00B894', '#FD79A8', '#FDCB6E', '#6C5CE7', '#FFFFFF'],
    ['#FF9FF3', '#F368E0', '#FF9F43', '#EE5253', '#0ABDE3'],
    ['#10AC84', '#5F27CD', '#54A0FF', '#EE5A24', '#C8D6E5'],
    ['#00D2D3', '#FF6B6B', '#48DBFB', '#1DD1A1', '#F368E0']
  ];
}

function generateCubes() {
  seed = random(100000);
  randomSeed(seed);
  cubes = [];
  
  let gridSize = 5;
  let spacing = 120;
  
  for (let x = -gridSize; x <= gridSize; x++) {
    for (let y = -gridSize; y <= gridSize; y++) {
      for (let z = -gridSize; z <= gridSize; z++) {
        if (random() > 0.7) {
          let size = random(20, 50);
          let col = color(random(colors[currentColorMode]));
          
          cubes.push({
            x: x * spacing,
            y: y * spacing,
            z: z * spacing,
            size: size,
            color: col,
            rotationSpeed: random(0.002, 0.01),
            pulsePhase: random(TWO_PI)
          });
        }
      }
    }
  }
}

function setupHandTracking() {
  try {
    // Create webcam with proper error handling
    cam = createCapture(VIDEO, function() {
      camReady = true;
      cam.size(320, 240);
      
      // Remove loading text
      let loading = select('#loading');
      if (loading) loading.remove();
      
      // Add webcam to container
      let webcamContainer = select('#webcam-container');
      if (webcamContainer) {
        cam.elt.style.width = '100%';
        cam.elt.style.height = '100%';
        cam.elt.style.objectFit = 'cover';
        webcamContainer.elt.appendChild(cam.elt);
      }
      
      // Setup handpose
      handpose = ml5.handpose(cam, { flipHorizontal: true }, function() {
        modelReady = true;
        console.log("Handpose model ready!");
      });
      
      handpose.on('predict', (results) => {
        predictions = results;
      });
    });
    
  } catch (error) {
    console.error("Webcam setup failed:", error);
    let loading = select('#loading');
    if (loading) loading.html('Camera access denied<br>Using mouse control');
  }
}

function updateHandControl() {
  if (!modelReady || predictions.length === 0) {
    // Fallback to mouse control
    targetRotX = map(mouseY, 0, height, -PI/2, PI/2);
    targetRotY = map(mouseX, 0, width, -PI, PI);
    return;
  }
  
  let hand = predictions[0];
  
  // Use landmarks for control - ml5 handpose returns landmarks array
  if (hand.landmarks && hand.landmarks.length > 0) {
    let wrist = hand.landmarks[0]; // wrist is index 0
    let indexTip = hand.landmarks[8]; // index finger tip
    
    if (wrist && indexTip) {
      // Map hand position to rotation
      targetRotX = map(wrist[1], 0, cam.height, -PI/2, PI/2);
      targetRotY = map(wrist[0], 0, cam.width, -PI, PI);
      
      // Use hand size for zoom
      let handSize = dist(wrist[0], wrist[1], indexTip[0], indexTip[1]);
      targetZoom = map(handSize, 50, 200, 500, 1200);
    }
  }
}

function draw() {
  background(0);
  
  // Update hand control less frequently for performance
  if (millis() - lastHandUpdate > HAND_UPDATE_INTERVAL) {
    updateHandControl();
    lastHandUpdate = millis();
  }
  
  // Smooth camera interpolation
  rotX = lerp(rotX, targetRotX, 0.1);
  rotY = lerp(rotY, targetRotY, 0.1);
  zoom = lerp(zoom, targetZoom, 0.1);
  
  // Camera setup
  translate(0, 0, -zoom);
  rotateX(rotX);
  rotateY(rotY);
  
  // Lighting
  ambientLight(100);
  directionalLight(255, 255, 255, 0.5, 0.5, -1);
  pointLight(200, 200, 255, 
    sin(frameCount * 0.01) * 300,
    cos(frameCount * 0.01) * 300,
    200
  );
  
  // Draw cubes
  for (let i = 0; i < cubes.length; i++) {
    let cube = cubes[i];
    
    push();
    translate(cube.x, cube.y, cube.z);
    
    // Rotate cubes
    rotateX(frameCount * cube.rotationSpeed);
    rotateY(frameCount * cube.rotationSpeed * 1.5);
    
    // Pulsing effect
    let pulse = sin(frameCount * 0.05 + cube.pulsePhase) * 5;
    let currentSize = cube.size + pulse;
    
    fill(cube.color);
    noStroke();
    
    box(currentSize);
    pop();
  }
  
  // Draw webcam preview with hand landmarks
  drawWebcamPreview();
  
  // Display status
  drawStatus();
}

function drawWebcamPreview() {
  if (!camReady) return;
  
  // Draw webcam feed in corner
  push();
  
  // Switch to 2D mode
  resetMatrix();
  drawingContext.disable(drawingContext.DEPTH_TEST);
  
  // Position in bottom right corner
  let previewWidth = 200;
  let previewHeight = 150;
  let x = width - previewWidth - 20;
  let y = height - previewHeight - 20;
  
  // Draw webcam background
  fill(0);
  stroke(255);
  strokeWeight(2);
  rect(x, y, previewWidth, previewHeight);
  
  // Draw webcam image
  image(cam, x, y, previewWidth, previewHeight);
  
  // Draw hand landmarks if detected
  if (predictions.length > 0) {
    drawHandLandmarks(x, y, previewWidth, previewHeight);
  }
  
  drawingContext.enable(drawingContext.DEPTH_TEST);
  pop();
}

function drawHandLandmarks(x, y, width, height) {
  push();
  
  let hand = predictions[0];
  
  if (hand.landmarks && Array.isArray(hand.landmarks)) {
    // Scale factors to map from cam coordinates to preview coordinates
    let scaleX = width / cam.width;
    let scaleY = height / cam.height;
    
    // Draw landmarks as points
    fill(0, 255, 0);
    noStroke();
    
    for (let i = 0; i < hand.landmarks.length; i++) {
      let landmark = hand.landmarks[i];
      let px = x + landmark[0] * scaleX;
      let py = y + landmark[1] * scaleY;
      circle(px, py, 6);
    }
    
    // Draw connections between landmarks
    stroke(255, 0, 0);
    strokeWeight(2);
    noFill();
    
    // Define hand connections (simplified)
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
    ];
    
    for (let i = 0; i < connections.length; i++) {
      let [start, end] = connections[i];
      if (hand.landmarks[start] && hand.landmarks[end]) {
        let startX = x + hand.landmarks[start][0] * scaleX;
        let startY = y + hand.landmarks[start][1] * scaleY;
        let endX = x + hand.landmarks[end][0] * scaleX;
        let endY = y + hand.landmarks[end][1] * scaleY;
        
        line(startX, startY, endX, endY);
      }
    }
  }
  
  pop();
}

function drawStatus() {
  push();
  fill(255);
  noStroke();
  textAlign(LEFT);
  textSize(14);
  
  let statusY = -height/2 + 30;
  text(`Cubes: ${cubes.length}`, -width/2 + 20, statusY);
  text(`FPS: ${frameRate().toFixed(1)}`, -width/2 + 20, statusY + 20);
  
  let controlStatus = 'Mouse';
  if (modelReady) {
    controlStatus = predictions.length > 0 ? 'Hand Tracking' : 'Hand Ready (no hand detected)';
  }
  
  text(`Control: ${controlStatus}`, -width/2 + 20, statusY + 40);
  text(`Colors: Mode ${currentColorMode + 1}`, -width/2 + 20, statusY + 60);
  
  pop();
}

function keyPressed() {
  if (key === 'r' || key === 'R') {
    generateCubes();
    return false;
  }
  if (key === 'c' || key === 'C') {
    currentColorMode = (currentColorMode + 1) % colors.length;
    generateCubes();
    return false;
  }
  if (key === 's' || key === 'S') {
    saveCanvas('3d_hand_cubes', 'png');
    return false;
  }
}

function mouseWheel(event) {
  targetZoom += event.delta * 0.5;
  targetZoom = constrain(targetZoom, 300, 1500);
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}