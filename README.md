# Poincare Disk Explorer

An interactive browser-based explorer for the Poincare disk model of hyperbolic geometry.

I made this to visualize hyperbolic geometry and understand it better. Hyperbolic lines can feel strange at first because they appear as arcs inside the disk, and triangles do not behave like the flat Euclidean triangles we are used to. This project lets you place points, draw geodesics, and build triangles so those ideas are easier to see directly.

I hope it helps others who are also trying to understand hyperbolic geometry.

## Features

- Place points inside the Poincare disk
- Draw geodesics between points
- Build hyperbolic triangles
- See the latest triangle angle sum and angle deficit
- Clear the scene and experiment again
- Use keyboard shortcuts for faster exploration

## How To Run

Open `poincare_disk_explorer.html` directly in a browser.

You can also run a local server from this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/poincare_disk_explorer.html
```

## Controls

- `1`: Point mode
- `2`: Geodesic mode
- `3`: Triangle mode
- `Esc`: Cancel the current pending line or triangle

## Files

- `poincare_disk_explorer.html`: page structure
- `poincare_disk_explorer.css`: visual styling
- `poincare_disk_explorer.js`: geometry logic and interactions
