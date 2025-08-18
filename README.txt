# SVG Whiteboard

A decent whiteboard tool, similar to Excalidraw, for drawing hand-drawn style vector graphics. It gets the job done.

## Features

- **Brush Tool**: Quickly draw freehand-style lines with adjustable roughness.
- **Pen Tool**: Create and edit precise, smooth Bézier curves.
- **Shape Tools**: Draw rectangles, ellipses, and lines.
- **Edit Tool**: Fine-tune any path by moving anchor points and control handles.
- **Rich Toolbar**: Includes color pickers, stroke width, undo/redo, and clear canvas functions.
- **Pan & Zoom**: Smooth canvas navigation.
- **Grid & Snapping**: Toggleable grid and snapping for precise alignment.

## Shortcuts

### Tools

- `V`: Edit Tool
- `M`: Move Tool
- `B`: Brush Tool
- `P`: Pen Tool
- `R`: Rectangle Tool
- `O`: Ellipse Tool
- `L`: Line Tool

### Editing

- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Shift + Z`: Redo
- `Ctrl/Cmd + C`: Copy Selection
- `Ctrl/Cmd + V`: Paste (supports shapes, images, and full canvas data)
- `Backspace` / `Delete`: Delete Selection
- `Escape`: Clear Selection / Cancel Current Drawing
- `Enter`: (With Pen/Line tool) Finish Path
- `Right-click -> Copy Canvas`: Copies the entire canvas as text for saving.

### Drawing Helpers

- `Shift` + Drag Shape: Draw a perfect square/circle.
- `Shift` + Drag Line: Snap line to 45° increments.
- `Shift` + Drag Handle: Move a Bézier handle independently (asymmetrically).
- `Ctrl` + Click on Path: (In Edit mode) Add a new point to a path.
- `Alt` + Click on Anchor: (In Edit mode) Delete a point from a path.

### Canvas

- **Pan**: Hold middle mouse button and drag, or `Alt` + drag.
- **Zoom**: Use the mouse wheel.
- `G`: Toggle Grid & Snapping

## Project Architecture
The project uses a modern architecture based on React Hooks to achieve separation of concerns and maximum maintainability.

- `App.tsx`: The composition root of the application, wiring everything together.
- `components/`: Contains UI components like `Toolbar` and `Whiteboard`.
- `hooks/`: Contains the majority of the application logic in custom React Hooks.
  - `usePaths`: Manages all path data (creation, updates, history).
  - `useToolbarState`: Manages the state of the toolbar (color, stroke width, current tool).
  - `usePointerInteraction`: Handles all pointer events on the canvas (drawing, editing, selecting).
  - `useViewTransform`: Controls canvas panning and zooming.
  - `useGlobalEventHandlers`: Manages global events like hotkeys and clipboard actions.
- `lib/`: Contains helper functions and algorithms. The `drawing` subdirectory handles all geometric calculations and transformations.
- `types.ts`: Defines the data structures and types used throughout the application.
- `constants.tsx`: Stores application-wide constants like colors and icons.