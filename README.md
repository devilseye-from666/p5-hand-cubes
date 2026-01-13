# 3D Hand Controlled Cubes

An interactive, high-performance 3D art sketch using **p5.js** and **ml5.js**. Control a floating world of cubes using your hand gestures via webcam!

## Features

- **👋 Hand & Mouse Interaction**:
  - **3D Cursor**: A glowing orb tracks your hand in real-time.
  - **Spring Physics**: Cubes bounce, wobble, and react elastically to your touch.
  - **Particle Effects**: Magical sparks appear when you interact with the world.
  - **Smart Idle**: Enters a cinematic auto-rotate mode when inactive.
- **⚡ High Performance**: Optimized rendering using state batching and geometry grouping.
- **🎨 Visuals**: 3D Starfield background, dynamic lighting, and shininess based on velocity.
- **🖥️ Modern UI**: Clean HTML overlay for stats and controls.

## Controls

| Gesture / Key       | Action                             |
| :------------------ | :--------------------------------- |
| **Move Hand/Mouse** | Rotate View & Move Cursor          |
| **Touch Cubes**     | Interaction (Repulsion/Growth)     |
| **Pinch Fingers**   | Zoom In / Out                      |
| **R**               | Regenerate World (New Random Seed) |
| **C**               | Cycle Color Palettes               |
| **S**               | Save High-Res Screenshot           |

## Technical Implementation

### Optimizations

- **Physics**: Real-time **Spring Physics** (Hooke's Law) for elastic, organic movement.
- **Render Batching**: Cubes are sorted by color for optimized state management.
- **Particle System**: Dynamic sparks and trails upon interaction.
- **DOM UI**: Text rendering is moved out of the WebGL context.

### Project Structure

- `index.html`: Entry point and UI structure.
- `style.css`: Modern styling for the overlay.
- `sketch.js`: Core logic for 3D rendering and ML integration.

## How to Run

1. Open `index.html` in a modern browser (Chrome/Edge recommended).
2. Allow camera access.
3. Wait for the model to load (Status: "Tracking Hand").
4. Enjoy!
