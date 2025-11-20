# 3D Hand Controlled Cubes

An interactive 3D generative art sketch using p5.js and ml5.js. Control the camera and zoom using your hand movements via the webcam!

## Features

- **Hand Tracking**: Uses `ml5.handpose` to track your hand in real-time.
    - **Rotate**: Move your hand up/down and left/right to rotate the 3D view.
    - **Zoom**: Move your hand closer/further (or pinch fingers) to zoom in and out.
- **Generative 3D Grid**: Creates a grid of floating 3D cubes with random sizes and colors.
- **Mouse Fallback**: If no camera is detected, you can control the view with your mouse.

## Controls

| Key / Action | Function |
| :--- | :--- |
| **Hand Movement** | Rotate Camera (X/Y axis) |
| **Hand Size / Pinch** | Zoom In/Out |
| **Mouse Move** | Rotate Camera (Fallback) |
| **Mouse Scroll** | Zoom In/Out (Fallback) |
| **R** | Regenerate Cubes (New Random Seed) |
| **C** | Change Color Palette |
| **S** | Save Screenshot |

## Technologies Used

- [p5.js](https://p5js.org/) - Creative coding library for canvas rendering.
- [ml5.js](https://ml5js.org/) - Friendly machine learning for the web (Handpose model).

## Code Structure

The project is built in a single file `sketch.js` for simplicity. Here's how it works:

### 1. Setup & Initialization (`setup()`)
- Creates a WebGL canvas for 3D rendering.
- Initializes the color palettes.
- Calls `generateCubes()` to create the initial random arrangement of cubes.
- Calls `setupHandTracking()` to initialize the webcam and the ml5 handpose model.

### 2. The Render Loop (`draw()`)
- **Hand Control**: Checks for hand updates every 100ms (throttled for performance).
- **Camera Movement**: Smoothly interpolates (`lerp`) the camera rotation and zoom based on hand position.
- **Lighting**: Sets up ambient, directional, and a moving point light.
- **Cube Rendering**: Loops through the `cubes` array and draws each one.
    - Applies rotation based on `frameCount`.
    - Applies a pulsing size effect using `sin()`.
- **UI**: Draws the webcam preview and status text on top of the 3D scene.

### 3. Hand Tracking Logic
- **`setupHandTracking()`**: Initializes the video capture and loads the ml5 model.
- **`updateHandControl()`**:
    - Maps the **Wrist Y position** to X-axis rotation (looking up/down).
    - Maps the **Wrist X position** to Y-axis rotation (looking left/right).
    - Calculates the distance between **Wrist** and **Index Finger Tip** to control Zoom.

### 4. Cube Generation (`generateCubes()`)
- Uses nested loops to create a 3D grid of potential cube positions.
- Uses `random()` to decide whether to place a cube at each spot (70% chance to skip), creating a sparse, organic structure.
- Assigns random colors, rotation speeds, and pulse phases to each cube.

## How to Run

1.  Open `index.html` in a modern web browser (Chrome, Firefox, Edge).
2.  Allow camera access when prompted.
3.  Wait for the "Handpose model ready!" message (or check the console).
4.  Start moving your hand!
