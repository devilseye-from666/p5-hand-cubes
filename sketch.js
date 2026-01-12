let seed;
let cubes = [];
let cam;
let handpose;
let predictions = [];

// Camera & Navigation
let rotX = 0;
let rotY = 0;
let zoom = 800;
let targetRotX = 0;
let targetRotY = 0;
let targetZoom = 800;

// Interaction State
let handPos = { x: 0, y: 0, z: 0, active: false };
let lastActivityTime = 0;
const IDLE_TIMEOUT = 2000; // 2 seconds to auto-rotate

// Visuals
let colors = [];
let currentColorMode = 0;

// System
let modelReady = false;
let camReady = false;
let lastHandUpdate = 0;
const HAND_UPDATE_INTERVAL = 30; // High responsiveness

// UI Elements
let uiFPS, uiCubeCount, uiStatus, uiLoading;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // Premium Rendering Settings
  setAttributes('antialias', true);
  setAttributes('perPixelLighting', true);
  
  // DOM Elements
  uiFPS = select('#fps-counter');
  uiCubeCount = select('#cube-counter');
  uiStatus = select('#status-text');
  uiLoading = select('#loading-overlay');
  
  initializeColors();
  generateCubes();
  setupHandTracking();
  
  lastActivityTime = millis();
}

function initializeColors() {
  colors = [
    ['#FF0055', '#00FFE5', '#FFE600', '#7700FF', '#FFFFFF'], // Cyber
    ['#00FF94', '#00B8A9', '#F8F3D4', '#005F73', '#94D2BD'], // Forest
    ['#FF5F6D', '#FFC371', '#FF9A8B', '#FF6B6B', '#C7F464'], // Sunset
    ['#2C3E50', '#E74C3C', '#ECF0F1', '#3498DB', '#2980B9']  // Midnight
  ];
}

function generateCubes() {
  seed = random(100000);
  randomSeed(seed);
  cubes = [];
  
  const gridSize = 6;
  const spacing = 120; // More space for interaction
  
  let tempCubes = [];
  
  for (let x = -gridSize; x <= gridSize; x++) {
    for (let y = -gridSize; y <= gridSize; y++) {
      for (let z = -gridSize; z <= gridSize; z++) {
        // Density noise for organic shape
        let n = noise(x * 0.1, y * 0.1, z * 0.1);
        
        if (random() > 0.70) { 
          let size = random(20, 50);
          let colIdx = floor(random(colors[currentColorMode].length));
          let colStr = colors[currentColorMode][colIdx];
          
          tempCubes.push({
            // Base Position
            bx: x * spacing,
            by: y * spacing,
            bz: z * spacing,
            // Current Position (for physics)
            x: x * spacing,
            y: y * spacing,
            z: z * spacing,
            
            size: size,
            baseSize: size,
            color: color(colStr),
            colorStr: colStr,
            
            // Animation props
            rotationSpeed: random(0.005, 0.02),
            pulsePhase: random(TWO_PI),
          });
        }
      }
    }
  }
  
  // Sort for batch rendering
  cubes = tempCubes.sort((a, b) => (a.colorStr > b.colorStr) ? 1 : -1);
  
  if (uiCubeCount) uiCubeCount.html(`Cubes: ${cubes.length}`);
}

function setupHandTracking() {
  try {
    cam = createCapture(VIDEO, () => {
        camReady = true;
        cam.size(320, 240);
        cam.parent('webcam-container');
        cam.elt.style.width = '100%';
        cam.elt.style.height = '100%';
        cam.elt.style.objectFit = 'cover';
        cam.elt.style.display = 'block';

        uiStatus.html('Loading Model...');
        
        handpose = ml5.handpose(cam, { flipHorizontal: true }, () => {
            modelReady = true;
            uiStatus.html('System Ready');
            uiLoading.addClass('hidden');
        });

        handpose.on('predict', results => predictions = results);
    });
  } catch (e) {
    console.error(e);
    uiStatus.html('Camera Failed');
    uiLoading.addClass('hidden');
  }
}

function updateInput() {
  let now = millis();
  
  // 1. Hand Tracking Input
  if (modelReady && predictions.length > 0) {
      lastActivityTime = now;
      handPos.active = true;
      
      let hand = predictions[0];
      if (hand.landmarks) {
          let palm = hand.landmarks[9]; // Hand center
          let thumb = hand.landmarks[4];
          let index = hand.landmarks[8];
          
          if (palm) {
              // Map 2D hand to 3D Rotation
              let nx = palm[0] / 320;
              let ny = palm[1] / 240;
              targetRotY = (nx - 0.5) * TWO_PI;
              targetRotX = (ny - 0.5) * PI;
              
              // Map to 3D World Position (approximate)
              // This creates the "Cursor" in 3D space
              // We invert X/Y to match screen movement
              handPos.x = (nx - 0.5) * 1000; 
              handPos.y = (ny - 0.5) * 1000;
              handPos.z = 200; // Hover in front
          }
          
          if (thumb && index) {
              // Pinch Zoom
              let d = dist(thumb[0], thumb[1], index[0], index[1]);
              targetZoom = map(d, 20, 150, 1500, 300, true);
          }
      }
  } 
  // 2. Mouse Input (Fallback/Override)
  else if (mouseIsPressed || (mouseX !== pmouseX || mouseY !== pmouseY)) {
      lastActivityTime = now;
      handPos.active = true;
      // Mouse overrides rotation
      let mx = (mouseX - width/2) / width;
      let my = (mouseY - height/2) / height;
      targetRotY = mx * PI;
      targetRotX = -my * PI;
      
      // Mouse cursor in 3D (approx)
      handPos.x = mx * 1000;
      handPos.y = my * 1000;
      handPos.z = 200;
  }
  // 3. Idle Mode
  else {
      handPos.active = false;
      if (now - lastActivityTime > IDLE_TIMEOUT) {
          // Auto rotate
          targetRotY += 0.005;
          targetRotX = sin(now * 0.001) * 0.5;
          targetZoom = 900 + sin(now * 0.0005) * 200;
      }
  }
}

function draw() {
  background(8); 
  
  if (millis() - lastHandUpdate > HAND_UPDATE_INTERVAL) {
    updateInput();
    lastHandUpdate = millis();
  }
  
  // Smooth Camera
  rotX = lerp(rotX, targetRotX, 0.08);
  rotY = lerp(rotY, targetRotY, 0.08);
  zoom = lerp(zoom, targetZoom, 0.05);

  // Scene Transform
  push();
  translate(0, 0, -zoom);
  rotateX(rotX);
  rotateY(rotY);

  // --- Lighting & Atmosphere ---
  ambientLight(50);
  directionalLight(255, 255, 255, 0.5, 0.8, -1);
  
  // Dynamic Colored Lights
  let t = frameCount * 0.02;
  pointLight(255, 0, 100, 600 * sin(t), 600 * cos(t), 500);
  pointLight(0, 100, 255, 600 * cos(t*0.7), 600 * sin(t*0.5), -500);

  // --- Draw Hand Cursor ---
  if (handPos.active) {
      push();
      translate(handPos.x, handPos.y, handPos.z);
      
      // Cursor Glow
      noStroke();
      fill(255, 200);
      emissiveMaterial(255, 255, 255);
      sphere(15);
      
      // Cursor Light
      pointLight(255, 255, 200, 0, 0, 0);
      pop();
  }

  // --- Draw Cubes with Physics ---
  noStroke();
  let lastColorStr = '';
  
  // Transform Hand Pos to Local Frame (Inverse Rotate)
  // Actually, we are rotating the WORLD, so the hand pos is already in world space relative to camera?
  // Let's keep physics simple: Distance based on the unrotated grid vs rotated hand is complex.
  // APPROXIMATION: We repel based on the static grid coordinates vs the "world" cursor reversed.
  // A better way is to move the cursor with the camera, which we did.

  for (let cube of cubes) {
    // 1. Calculate Interaction
    // Distance from Cursor to Cube Center
    // Since we rotate the whole world, the cursor (which moves with camera rotation mapping)
    // acts effectively as a raycast. 
    
    // BUT! Since `translate(x,y,z)` happens inside the rotation, 
    // we need to calculate the actual screenspace-ish distance or world distance.
    // For simplicity, let's just use the `handPos` which scales roughly to the grid.
    
    let d = dist(cube.bx, cube.by, cube.bz, handPos.x, handPos.y, handPos.z);
    let repulsion = 0;
    
    if (handPos.active && d < 300) {
       // Repulsion vector
       let force = map(d, 0, 300, 100, 0);
       repulsion = force;
    }
    
    // Apply Physics to Cube (Move away from cursor)
    // Vector from cursor to cube
    let dx = cube.bx - handPos.x;
    let dy = cube.by - handPos.y;
    let dz = cube.bz - handPos.z;
    
    // Normalize and scale
    let mag = sqrt(dx*dx + dy*dy + dz*dz);
    if (mag > 0) {
        dx /= mag; dy /= mag; dz /= mag;
    }
    
    // Target position (Base + Repulsion)
    let tx = cube.bx + dx * repulsion;
    let ty = cube.by + dy * repulsion;
    let tz = cube.bz + dz * repulsion;
    
    // Smoothly interpolate current pos to target
    cube.x = lerp(cube.x, tx, 0.1);
    cube.y = lerp(cube.y, ty, 0.1);
    cube.z = lerp(cube.z, tz, 0.1);

    // 2. Rendering
    if (cube.colorStr !== lastColorStr) {
       fill(cube.color);
       specularMaterial(200);
       shininess(40);
       lastColorStr = cube.colorStr;
    }
    
    push();
    translate(cube.x, cube.y, cube.z);
    
    rotateX(frameCount * cube.rotationSpeed);
    rotateY(frameCount * cube.rotationSpeed * 1.5);
    
    // Dynamic Size (Grow when close to hand)
    let grow = (repulsion > 10) ? map(repulsion, 10, 100, 1, 1.5) : 1;
    let pulse = sin(frameCount * 0.05 + cube.pulsePhase);
    let size = cube.baseSize * grow + (pulse * 3);
    
    box(size);
    pop();
  }
  
  pop(); // End Scene

  // UI Updates 
  if (frameCount % 10 === 0) {
      if(uiFPS) uiFPS.html(`FPS: ${floor(frameRate())}`);
      if(handPos.active) {
          uiStatus.html('Hand Active');
          uiStatus.style('color', '#00ff9d');
      } else {
          uiStatus.html('Idle / Auto-Pilot');
          uiStatus.style('color', '#00aaff');
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
    if (key === 's' || key === 'S') saveCanvas('crystal_world', 'png');
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}