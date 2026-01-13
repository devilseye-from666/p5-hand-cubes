let seed;
let cubes = [];
let particles = [];
let stars = [];
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
const IDLE_TIMEOUT = 2000;

// Visuals
let colors = [];
let currentColorMode = 0;

// System
let modelReady = false;
let camReady = false;
let lastHandUpdate = 0;
const HAND_UPDATE_INTERVAL = 30;

// UI Elements
let uiFPS, uiCubeCount, uiStatus, uiLoading;

// --- Classes ---

class Star {
  constructor() {
    this.x = random(-2000, 2000);
    this.y = random(-2000, 2000);
    this.z = random(-2000, 2000);
    this.size = random(1, 4);
    this.brightness = random(150, 255);
  }

  display() {
    push();
    translate(this.x, this.y, this.z);
    stroke(255, this.brightness);
    strokeWeight(this.size);
    point(0, 0);
    pop();
  }
}

class Particle {
  constructor(x, y, z, colorStr) {
    this.pos = createVector(x, y, z);
    this.vel = p5.Vector.random3D().mult(random(2, 8));
    this.acc = createVector(0, 0, 0);
    this.life = 255;
    this.colorStr = colorStr;
    this.decay = random(4, 8);
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.life -= this.decay;
    this.vel.mult(0.95); // Drag
  }

  display() {
    if (this.life <= 0) return;
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    noStroke();
    fill(color(this.colorStr)); // Use raw color or parse it? P5 handles strings fine usually
    // We need alpha, so let's use the color object if possible, but for performance string is ok + fast generic fade 
    // Actually applying alpha to a hex string is tricky without parsing.
    // Let's just use emissive material for glow effect or simple fill
    emissiveMaterial(this.life, this.life, this.life);
    sphere(2);
    pop();
  }

  isDead() {
    return this.life <= 0;
  }
}

class Cube {
  constructor(x, y, z, size, colorStr) {
    this.basePos = createVector(x, y, z);
    this.pos = this.basePos.copy();
    this.vel = createVector(0, 0, 0);
    this.acc = createVector(0, 0, 0);
    
    this.size = size;
    this.baseSize = size;
    this.colorStr = colorStr;
    this.c = color(colorStr);
    
    // Spring Physics Properties
    this.mass = map(size, 20, 50, 1, 4); 
    this.springK = 0.1;  // Stiffness
    this.damping = 0.85; // Friction
    
    this.rotationSpeed = random(0.005, 0.02);
    this.pulsePhase = random(TWO_PI);
  }

  update() {
    // 1. Spring Force towards base position
    let springForce = p5.Vector.sub(this.basePos, this.pos);
    springForce.mult(this.springK);
    this.applyForce(springForce);

    // 2. Repulsion from Hand
    if (handPos.active) {
      // Approximate World Space distance
      let d = dist(this.pos.x, this.pos.y, this.pos.z, handPos.x, handPos.y, handPos.z);
      if (d < 350) {
        let repDir = p5.Vector.sub(this.pos, createVector(handPos.x, handPos.y, handPos.z));
        repDir.normalize();
        let forceMag = map(d, 0, 350, 15, 0); // Stronger force
        repDir.mult(forceMag);
        this.applyForce(repDir);
        
        // Spawn particles on strong interaction
        if (d < 100 && random() < 0.1) {
             particles.push(new Particle(this.pos.x, this.pos.y, this.pos.z, this.colorStr));
        }
      }
    }

    // 3. Integration
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.vel.mult(this.damping);
    this.acc.mult(0); // Reset Ax
  }

  applyForce(f) {
    let fCopy = f.copy();
    fCopy.div(this.mass);
    this.acc.add(fCopy);
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    
    // Dynamic Rotation based on velocity + idle spin
    rotateX(frameCount * this.rotationSpeed + this.vel.y * 0.05);
    rotateY(frameCount * this.rotationSpeed * 1.5 + this.vel.x * 0.05);
    
    // Pulse size
    let velMag = this.vel.mag(); // Stretch when moving fast
    let pulse = sin(frameCount * 0.05 + this.pulsePhase);
    let currentSize = this.baseSize + (pulse * 2) + (velMag * 2);
    
    fill(this.c);
    specularMaterial(255); 
    shininess(map(velMag, 0, 10, 10, 100)); // Shinier when moving
    
    box(currentSize);
    pop();
  }
}

// --- Main Functions ---

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  setAttributes('antialias', true);
  setAttributes('perPixelLighting', true);
  
  uiFPS = select('#fps-counter');
  uiCubeCount = select('#cube-counter');
  uiStatus = select('#status-text');
  uiLoading = select('#loading-overlay');
  
  initializeColors();
  generateStars();
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

function generateStars() {
  stars = [];
  for(let i = 0; i < 400; i++) {
    stars.push(new Star());
  }
}

function generateCubes() {
  seed = random(100000);
  randomSeed(seed);
  cubes = [];
  
  const gridSize = 5; // Slightly reduced grid for performance with physics
  const spacing = 130;
  
  let tempCubes = [];
  
  for (let x = -gridSize; x <= gridSize; x++) {
    for (let y = -gridSize; y <= gridSize; y++) {
      for (let z = -gridSize; z <= gridSize; z++) {
        let n = noise(x * 0.1, y * 0.1, z * 0.1);
        if (random() > 0.65) { 
          let size = random(20, 50);
          let colIdx = floor(random(colors[currentColorMode].length));
          let colStr = colors[currentColorMode][colIdx];
          
          tempCubes.push(new Cube(
            x * spacing, 
            y * spacing, 
            z * spacing, 
            size, 
            colStr
          ));
        }
      }
    }
  }
  
  // Sort by color for batching (optimization) - though P5 might not batch standard primitives easily without custom geometry, 
  // it helps state changes.
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
          let palm = hand.landmarks[9];
          let thumb = hand.landmarks[4];
          let index = hand.landmarks[8];
          
          if (palm) {
              let nx = palm[0] / 320;
              let ny = palm[1] / 240;
              targetRotY = (nx - 0.5) * TWO_PI;
              targetRotX = (ny - 0.5) * PI;
              
              handPos.x = (nx - 0.5) * 1200; 
              handPos.y = (ny - 0.5) * 1200;
              handPos.z = 300; 
          }
          
          if (thumb && index) {
              let d = dist(thumb[0], thumb[1], index[0], index[1]);
              targetZoom = map(d, 20, 150, 1500, 300, true);
          }
      }
  } 
  // 2. Mouse Input
  else if (mouseIsPressed || (mouseX !== pmouseX || mouseY !== pmouseY)) {
      lastActivityTime = now;
      handPos.active = true;
      let mx = (mouseX - width/2) / width;
      let my = (mouseY - height/2) / height;
      targetRotY = mx * PI;
      targetRotX = -my * PI;
      
      handPos.x = mx * 1200;
      handPos.y = my * 1200;
      handPos.z = 300;
  }
  // 3. Idle Mode
  else {
      handPos.active = false;
      if (now - lastActivityTime > IDLE_TIMEOUT) {
          targetRotY += 0.003;
          targetRotX = sin(now * 0.0005) * 0.3;
          targetZoom = 1000 + sin(now * 0.0003) * 300;
      }
  }
}

function draw() {
  // Deep space background
  background(5, 5, 12); 
  
  if (millis() - lastHandUpdate > HAND_UPDATE_INTERVAL) {
    updateInput();
    lastHandUpdate = millis();
  }
  
  rotX = lerp(rotX, targetRotX, 0.05);
  rotY = lerp(rotY, targetRotY, 0.05);
  zoom = lerp(zoom, targetZoom, 0.05);

  push();
  translate(0, 0, -zoom);
  rotateX(rotX);
  rotateY(rotY);

  // --- Lighting ---
  ambientLight(40);
  directionalLight(255, 255, 255, 0.5, 0.8, -1);
  let t = frameCount * 0.02;
  pointLight(255, 0, 100, 800 * sin(t), 800 * cos(t), 600);
  pointLight(0, 100, 255, 800 * cos(t*0.7), 800 * sin(t*0.5), -600);

  // --- Draw Stars ---
  // Rotate starfield slowly oppositely for depth
  push();
  rotateY(frameCount * -0.001);
  for(let star of stars) star.display();
  pop();

  // --- Draw Cursor ---
  if (handPos.active) {
      push();
      translate(handPos.x, handPos.y, handPos.z);
      noStroke();
      fill(255, 200);
      emissiveMaterial(255, 255, 255);
      sphere(15);
      pointLight(255, 255, 220, 0, 0, 0);
      
      // Cursor Trail helper
      if(frameCount % 5 === 0) {
        particles.push(new Particle(handPos.x, handPos.y, handPos.z, '#FFFFFF'));
      }
      pop();
  }

  // --- Cubes ---
  // Optimization: Cubes are sorted by color in generate to minimize state changes if we moved rendering logic here.
  // Currently, each cube handles its own styling for dynamic effects (shininess), so we iterate directly.
  
  for (let cube of cubes) {
    cube.update();
    cube.display();
  }

  // --- Particles ---
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }
  
  pop(); // End Scene

  // UI Updates 
  if (frameCount % 10 === 0) {
      if(uiFPS) uiFPS.html(`FPS: ${floor(frameRate())}`);
      if(handPos.active) {
          uiStatus.html('System Active');
          uiStatus.style('color', '#00ff9d');
      } else {
          uiStatus.html('Standby Mode');
          uiStatus.style('color', '#00aaff');
      }
  }
}

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