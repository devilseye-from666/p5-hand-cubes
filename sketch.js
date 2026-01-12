let seed;
let cubes = [];
let cam;
let handpose;
let predictions = [];

// Camera & IO
let rotX = 0;
let rotY = 0;
let zoom = 800;
let targetRotX = 0;
let targetRotY = 0;
let targetZoom = 800;

// Colors & Visuals
let colors = [];
let currentColorMode = 0;

// State
let modelReady = false;
let camReady = false;
let lastHandUpdate = 0;
const HAND_UPDATE_INTERVAL = 50; // Faster updates

// UI Elements (DOM)
let uiFPS, uiCubeCount, uiStatus, uiLoading;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  
  // High quality rendering settings
  setAttributes('antialias', true);
  setAttributes('perPixelLighting', true);
  
  // Initialize DOM connections
  uiFPS = select('#fps-counter');
  uiCubeCount = select('#cube-counter');
  uiStatus = select('#status-text');
  uiLoading = select('#loading-overlay');
  
  // Initialize visual systems
  initializeColors();
  generateCubes();
  
  // Setup Webcam & ML
  setupHandTracking();
}

function initializeColors() {
  colors = [
    // Neon Cyber
    ['#FF0055', '#00FFE5', '#FFE600', '#7700FF', '#FFFFFF'],
    // Forest Glass
    ['#00FF94', '#00B8A9', '#F8F3D4', '#005F73', '#94D2BD'],
    // Sunset
    ['#FF5F6D', '#FFC371', '#FF9A8B', '#FF6B6B', '#C7F464'],
    // Midnight
    ['#2C3E50', '#E74C3C', '#ECF0F1', '#3498DB', '#2980B9']
  ];
}

function generateCubes() {
  seed = random(100000);
  randomSeed(seed);
  cubes = [];
  
  const gridSize = 6; // Larger grid
  const spacing = 120;
  
  // Create generic cube data
  let tempCubes = [];
  
  for (let x = -gridSize; x <= gridSize; x++) {
    for (let y = -gridSize; y <= gridSize; y++) {
      for (let z = -gridSize; z <= gridSize; z++) {
        // Density noise
        let n = noise(x * 0.1, y * 0.1, z * 0.1);
        
        if (random() > 0.65) { 
          let size = random(20, 60);
          // Pick color index
          let colIdx = floor(random(colors[currentColorMode].length));
          let colStr = colors[currentColorMode][colIdx];
          
          tempCubes.push({
            x: x * spacing,
            y: y * spacing,
            z: z * spacing,
            size: size,
            color: color(colStr),
            colorStr: colStr, // for grouping
            rotationSpeed: random(0.005, 0.02),
            pulsePhase: random(TWO_PI),
            roughness: random(0.1, 0.5)
          });
        }
      }
    }
  }
  
  // IMPORTANT: Sort by color to batch draw calls (render optimization)
  // This minimizes state changes in the GPU loop
  cubes = tempCubes.sort((a, b) => {
    if (a.colorStr < b.colorStr) return -1;
    if (a.colorStr > b.colorStr) return 1;
    return 0;
  });
  
  if (uiCubeCount) uiCubeCount.html(`Cubes: ${cubes.length}`);
}

function setupHandTracking() {
  try {
    cam = createCapture(VIDEO, () => {
        camReady = true;
        cam.size(320, 240);
        
        // Correctly parenting the p5 element handles the DOM moving
        // and doesn't require manual style manipulation for display:none
        cam.parent('webcam-container');
        
        // Stylize the video element to fill the container
        cam.elt.style.width = '100%';
        cam.elt.style.height = '100%';
        cam.elt.style.objectFit = 'cover';
        cam.elt.style.display = 'block'; // Ensure it's visible

        uiStatus.html('Loading Hand Model...');
        
        handpose = ml5.handpose(cam, { flipHorizontal: true }, () => {
            modelReady = true;
            console.log("Handpose ready");
            uiStatus.html('System Ready');
            uiLoading.addClass('hidden'); // Fade out loader
        });

        handpose.on('predict', results => predictions = results);
    });
  } catch (e) {
    console.error(e);
    uiStatus.html('Camera Error - Mouse OK');
    uiLoading.addClass('hidden');
  }
}

function updateHandControl() {
  if (!modelReady || predictions.length === 0) {
    // Mouse Interaction
    // Normalized coordinates (-1 to 1)
    let mx = (mouseX - width/2) / width;
    let my = (mouseY - height/2) / height;
    
    // Smooth falloff to center
    targetRotY = mx * PI;
    targetRotX = -my * PI; // Invert Y for natural feel
    return;
  }
  
  let hand = predictions[0];
  if (hand.landmarks) {
     // Landmark 9 is middle finger mcp (roughly center of hand)
     let palm = hand.landmarks[9];
     let thumb = hand.landmarks[4];
     let index = hand.landmarks[8];
     
     if (palm) {
         // Map Hand X/Y to Rotation
         // Webcam is 320x240
         let nx = palm[0] / 320;
         let ny = palm[1] / 240;
         
         // Remap to rotation angles
         // Center (0.5) = 0 rotation
         targetRotY = (nx - 0.5) * TWO_PI; // Wider range
         targetRotX = (ny - 0.5) * PI;
     }
     
     // Pinch to Zoom
     if (thumb && index) {
         let pinchDist = dist(thumb[0], thumb[1], index[0], index[1]);
         // Simple remapping: Pinch close = Zoom OUT, Fingers apart = Zoom IN
         // Normal pinch is ~20-30, Open is ~100+
         targetZoom = map(pinchDist, 20, 150, 1500, 200, true);
     }
  }
}

function draw() {
  background(10); // Very dark gray, not fully black for depth
  
  // Logic Update
  if (millis() - lastHandUpdate > HAND_UPDATE_INTERVAL) {
    updateHandControl();
    lastHandUpdate = millis();
  }
  
  // Physics / Smoothing
  rotX = lerp(rotX, targetRotX, 0.08); // Smoother
  rotY = lerp(rotY, targetRotY, 0.08);
  zoom = lerp(zoom, targetZoom, 0.05); // Heavy smoothing for zoom
  
  // -----------------------
  // 3D Scene Setup
  // -----------------------
  translate(0, 0, -zoom);
  rotateX(rotX);
  rotateY(rotY);
  
  // Dynamic Lighting
  ambientLight(40);
  
  // Main directional light
  directionalLight(255, 255, 255, 0.5, 1, -1);
  
  // Moving colorful lights
  let t = frameCount * 0.02;
  pointLight(255, 0, 100, 500 * sin(t), 500 * cos(t), 500);
  pointLight(0, 200, 255, 500 * cos(t*0.7), 500 * sin(t*0.7), -500);

  // -----------------------
  // Render Cubes
  // -----------------------
  // Use batching strategies
  noStroke();
  
  // Since we sorted cubes by color, we can set material once per color group
  let lastColorStr = '';
  
  for (let cube of cubes) {
    // Check if color changed
    if (cube.colorStr !== lastColorStr) {
       fill(cube.color);
       // Add material properties
       specularMaterial(200); 
       shininess(30);
       lastColorStr = cube.colorStr;
    }
    
    push();
    translate(cube.x, cube.y, cube.z);
    
    // Animation
    let rSpeed = cube.rotationSpeed;
    rotateX(frameCount * rSpeed);
    rotateY(frameCount * rSpeed * 1.5);
    
    // Pulse
    let pulse = sin(frameCount * 0.05 + cube.pulsePhase);
    let size = cube.size + (pulse * 4);
    
    box(size);
    pop();
  }
  
  // -----------------------
  // UI Updates
  // -----------------------
  if (frameCount % 10 === 0) { // Throttle DOM updates
      if (uiFPS) uiFPS.html(`FPS: ${floor(frameRate())}`);
      if (modelReady && predictions.length > 0) {
          uiStatus.html('Tracking Hand');
          uiStatus.style('color', '#00ff9d');
      } else if (modelReady) {
          uiStatus.html('No Hand Detected');
          uiStatus.style('color', '#ffaa00');
      }
  }
}

// Interactions
function keyPressed() {
    if (key === 'r' || key === 'R') generateCubes();
    if (key === 'c' || key === 'C') {
        currentColorMode = (currentColorMode + 1) % colors.length;
        generateCubes();
    }
    if (key === 's' || key === 'S') saveCanvas('my_hand_art', 'png');
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}