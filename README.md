# 3D Hand Controlled Cubes

An interactive, high-performance 3D art sketch using **p5.js** and **ml5.js**. Control a floating world of cubes using your hand gestures via webcam!

## Features

- **👋 Hand Tracking**: Real-time control using `ml5.handpose`.
  - **Rotate**: Move your open hand to rotate the world.
  - **Zoom**: Pinch your thumb and index finger to zoom in/out.
- **⚡ High Performance**: Optimized rendering using state batching and geometry grouping.
- **🎨 Visuals**: Dynamic lighting, shininess/specular materials, and neon color palettes.
- **🖥️ Modern UI**: Clean HTML overlay for stats and controls, separate from the 3D canvas.

## Controls

| Gesture / Key     | Action                              |
| :---------------- | :---------------------------------- |
| **Move Hand**     | Rotate View (X/Y Axis)              |
| **Pinch Fingers** | Zoom In / Out                       |
| **Mouse Move**    | Rotate View (Fallback if no camera) |
| **R**             | Regenerate World (New Random Seed)  |
| **C**             | Cycle Color Palettes                |
| **S**             | Save High-Res Screenshot            |

## Technical Implementation

### Optimizations

- **Render Batching**: Cubes are sorted by color to minimize GPU state changes (`fill`, `material`).
- **DOM UI**: Text rendering is moved out of the WebGL context into the DOM for crisp text and better performance.

### Project Structure

- `index.html`: Entry point and UI structure.
- `style.css`: Modern styling for the overlay.
- `sketch.js`: Core logic for 3D rendering and ML integration.

## How to Run

1. Open `index.html` in a modern browser (Chrome/Edge recommended).
2. Allow camera access.
3. Wait for the model to load (Status: "Tracking Hand").
4. Enjoy!
