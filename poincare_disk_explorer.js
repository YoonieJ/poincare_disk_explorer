const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 480;
const R = 210;
const CX = W / 2;
const CY = W / 2;

const angleCard = document.getElementById('angle-card');
const angleSum = document.getElementById('angle-sum');
const angleDetail = document.getElementById('angle-detail');
const angleDeficit = document.getElementById('angle-deficit');
const clearButton = document.getElementById('clear-btn');
const statusText = document.getElementById('status-text');
const pointCount = document.getElementById('point-count');
const lineCount = document.getElementById('line-count');
const triangleCount = document.getElementById('triangle-count');
const toolButtons = {
  point: document.getElementById('btn-point'),
  line: document.getElementById('btn-line'),
  triangle: document.getElementById('btn-triangle'),
};

let tool = 'point';
let points = [];
let lines = [];
let triangles = [];
let pendingLine = null;
let pendingTri = [];
let hovered = null;

const COLORS = {
  point: '#378ADD',
  line: '#639922',
  tri: '#D85A30',
  triLine: '#E8593C',
  ghost: '#888780',
};

function cssColor(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function setTool(nextTool) {
  tool = nextTool;
  pendingLine = null;
  pendingTri = [];

  Object.entries(toolButtons).forEach(([id, button]) => {
    button.classList.toggle('active', id === nextTool);
    button.setAttribute('aria-pressed', String(id === nextTool));
  });

  draw();
}

function clearAll() {
  points = [];
  lines = [];
  triangles = [];
  pendingLine = null;
  pendingTri = [];
  angleCard.hidden = true;
  draw();
}

function cancelPending() {
  pendingLine = null;
  pendingTri = [];
  draw();
}

function updateSceneStats() {
  pointCount.textContent = points.length;
  lineCount.textContent = lines.length;
  triangleCount.textContent = triangles.length;
}

function updateStatus() {
  let message = 'Point mode: click inside the disk to place a point.';

  if (tool === 'line') {
    message = pendingLine
      ? 'Line mode: choose a second point to complete the geodesic.'
      : 'Line mode: choose the first point.';
  } else if (tool === 'triangle') {
    const remaining = 3 - pendingTri.length;

    message = pendingTri.length === 0
      ? 'Triangle mode: choose the first vertex.'
      : `Triangle mode: choose ${remaining} more ${remaining === 1 ? 'vertex' : 'vertices'}.`;
  }

  statusText.textContent = message;
}

// Convert canvas pixel to disk coords (unit disk).
function toUnit(px, py) {
  return [(px - CX) / R, (py - CY) / R];
}

function toPx(ux, uy) {
  return [CX + ux * R, CY + uy * R];
}

function len2(x, y) {
  return x * x + y * y;
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

// Find geodesic arc through two unit-disk points.
// Returns {cx, cy, r} for the Euclidean arc, or null if points are antipodal/collinear with center.
function geodesic(p1, p2) {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const cross = x1 * y2 - y1 * x2;

  if (Math.abs(cross) < 1e-6) {
    return null;
  }

  // The geodesic circle passes through p1, p2, and the inversion p1*.
  const inv1 = [x1 / len2(x1, y1), y1 / len2(x1, y1)];
  const ax = x1;
  const ay = y1;
  const bx = x2;
  const by = y2;
  const cx2 = inv1[0];
  const cy2 = inv1[1];
  const D = 2 * (ax * (by - cy2) + bx * (cy2 - ay) + cx2 * (ay - by));

  if (Math.abs(D) < 1e-9) {
    return null;
  }

  const ux2 = (
    (ax * ax + ay * ay) * (by - cy2)
    + (bx * bx + by * by) * (cy2 - ay)
    + (cx2 * cx2 + cy2 * cy2) * (ay - by)
  ) / D;
  const uy2 = (
    (ax * ax + ay * ay) * (cx2 - bx)
    + (bx * bx + by * by) * (ax - cx2)
    + (cx2 * cx2 + cy2 * cy2) * (bx - ax)
  ) / D;
  const r = Math.hypot(ax - ux2, ay - uy2);

  return { cx: ux2, cy: uy2, r };
}

function drawDisk() {
  ctx.clearRect(0, 0, W, W);

  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.fillStyle = dark ? '#1a1a18' : '#f7f6f2';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.strokeStyle = dark ? '#444' : '#bbb';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CX, CY, 2, 0, Math.PI * 2);
  ctx.fillStyle = dark ? '#555' : '#ccc';
  ctx.fill();
}

function drawHover() {
  if (!hovered) {
    return;
  }

  const [px, py] = toPx(...hovered);

  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, 9, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(29, 117, 189, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawGeodesic(p1, p2, color = COLORS.line, lw = 1.8, dashed = false) {
  const [x1, y1] = toPx(...p1);
  const [x2, y2] = toPx(...p2);
  const g = geodesic(p1, p2);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;

  if (dashed) {
    ctx.setLineDash([5, 4]);
  }

  if (!g) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const L = Math.hypot(dx, dy);
    const nx = dx / L;
    const ny = dy / L;
    const start = [CX + (-nx) * R, CY + (-ny) * R];
    const end = [CX + nx * R, CY + ny * R];

    ctx.beginPath();
    ctx.moveTo(...start);
    ctx.lineTo(...end);
    ctx.stroke();
  } else {
    const { cx, cy, r } = g;
    const pcx = CX + cx * R;
    const pcy = CY + cy * R;
    const pr = r * R;
    const a1 = Math.atan2(y1 - pcy, x1 - pcx);
    const a2 = Math.atan2(y2 - pcy, x2 - pcx);
    let da = a2 - a1;

    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;

    ctx.beginPath();
    ctx.arc(pcx, pcy, pr, a1, a1 + da);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

// Compute angle at vertex v between edges to a and b (all unit-disk coords).
function hypAngle(v, a, b) {
  function tangent(from, to) {
    const g = geodesic(from, to);
    const [fx, fy] = from;

    if (!g) {
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const L = Math.hypot(dx, dy);

      return [dx / L, dy / L];
    }

    const { cx, cy } = g;
    const rx = fx - cx;
    const ry = fy - cy;
    const t1 = [-ry, rx];
    const t2 = [ry, -rx];
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dot1 = t1[0] * dx + t1[1] * dy;
    const tang = dot1 > 0 ? t1 : t2;
    const L = Math.hypot(...tang);

    return [tang[0] / L, tang[1] / L];
  }

  const t1 = tangent(v, a);
  const t2 = tangent(v, b);
  const dot = Math.max(-1, Math.min(1, t1[0] * t2[0] + t1[1] * t2[1]));

  return Math.acos(dot) * 180 / Math.PI;
}

function draw() {
  drawDisk();

  for (const [p1, p2] of lines) {
    drawGeodesic(p1, p2, COLORS.line, 1.8);
  }

  for (const tri of triangles) {
    const [a, b, c] = tri;

    fillTriangle(a, b, c);
    drawGeodesic(a, b, COLORS.triLine, 2.2);
    drawGeodesic(b, c, COLORS.triLine, 2.2);
    drawGeodesic(a, c, COLORS.triLine, 2.2);
  }

  if (pendingLine && hovered) {
    drawGeodesic(pendingLine, hovered, COLORS.ghost, 1.2, true);
  }

  if (pendingTri.length === 1 && hovered) {
    drawGeodesic(pendingTri[0], hovered, COLORS.ghost, 1.2, true);
  }

  if (pendingTri.length === 2 && hovered) {
    drawGeodesic(pendingTri[0], pendingTri[1], COLORS.triLine, 2);
    drawGeodesic(pendingTri[1], hovered, COLORS.ghost, 1.2, true);
    drawGeodesic(pendingTri[0], hovered, COLORS.ghost, 1.2, true);
  }

  for (const p of points) {
    const [px, py] = toPx(...p);

    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.point;
    ctx.fill();
    ctx.strokeStyle = cssColor('--panel-bg', '#fff');
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  for (const p of pendingTri) {
    const [px, py] = toPx(...p);

    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.triLine;
    ctx.fill();
    ctx.strokeStyle = cssColor('--panel-bg', '#fff');
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawHover();
  updateAngles();
  updateSceneStats();
  updateStatus();
}

function fillTriangle(a, b, c) {
  function arcPoints(p1, p2, n = 40) {
    const g = geodesic(p1, p2);
    const [x1, y1] = toPx(...p1);
    const [x2, y2] = toPx(...p2);

    if (!g) {
      const pts = [];

      for (let i = 0; i <= n; i += 1) {
        pts.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]);
      }

      return pts;
    }

    const { cx, cy, r } = g;
    const pcx = CX + cx * R;
    const pcy = CY + cy * R;
    const pr = r * R;
    const a1 = Math.atan2(y1 - pcy, x1 - pcx);
    const a2 = Math.atan2(y2 - pcy, x2 - pcx);
    let da = a2 - a1;

    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;

    const pts = [];

    for (let i = 0; i <= n; i += 1) {
      const ang = a1 + da * i / n;
      pts.push([pcx + pr * Math.cos(ang), pcy + pr * Math.sin(ang)]);
    }

    return pts;
  }

  const path = [...arcPoints(a, b), ...arcPoints(b, c), ...arcPoints(c, a)];

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(...path[0]);

  for (const [px, py] of path.slice(1)) {
    ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.fillStyle = 'rgba(232, 89, 60, 0.12)';
  ctx.fill();
  ctx.restore();
}

function updateAngles() {
  if (triangles.length === 0) {
    angleCard.hidden = true;
    return;
  }

  const [a, b, c] = triangles[triangles.length - 1];
  const A = hypAngle(a, b, c);
  const B = hypAngle(b, a, c);
  const C = hypAngle(c, a, b);
  const sum = A + B + C;
  const deficit = 180 - sum;

  angleCard.hidden = false;
  angleSum.textContent = `${sum.toFixed(1)}°`;
  angleDetail.textContent = `${A.toFixed(1)}° + ${B.toFixed(1)}° + ${C.toFixed(1)}°`;
  angleDeficit.textContent = `Deficit: ${deficit.toFixed(1)}° below 180°`;
}

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
}

function findNearPoint(ux, uy) {
  for (const p of [...points, ...pendingTri]) {
    if (dist([ux, uy], p) < 0.04) {
      return p;
    }
  }

  return null;
}

canvas.addEventListener('mousemove', (e) => {
  const [px, py] = getMousePos(e);
  const [ux, uy] = toUnit(px, py);

  if (len2(ux, uy) >= 0.98) {
    hovered = null;
    draw();
    return;
  }

  hovered = [ux, uy];

  const near = findNearPoint(ux, uy);
  if (near) {
    hovered = near;
  }

  draw();
});

canvas.addEventListener('mouseleave', () => {
  hovered = null;
  draw();
});

canvas.addEventListener('click', (e) => {
  const [px, py] = getMousePos(e);
  const [ux, uy] = toUnit(px, py);

  if (len2(ux, uy) >= 0.98) {
    return;
  }

  let pt = [ux, uy];
  const near = findNearPoint(ux, uy);

  if (near) {
    pt = near;
  }

  if (tool === 'point') {
    if (!points.some((p) => dist(p, pt) < 0.015)) {
      points.push(pt);
    }
  } else if (tool === 'line') {
    if (!pendingLine) {
      pendingLine = pt;

      if (!points.some((p) => dist(p, pt) < 0.015)) {
        points.push(pt);
      }
    } else {
      if (dist(pendingLine, pt) > 0.02) {
        lines.push([pendingLine, pt]);

        if (!points.some((p) => dist(p, pt) < 0.015)) {
          points.push(pt);
        }
      }

      pendingLine = null;
    }
  } else if (tool === 'triangle') {
    if (pendingTri.length < 2) {
      if (!pendingTri.some((p) => dist(p, pt) < 0.015)) {
        if (!points.some((p) => dist(p, pt) < 0.015)) {
          points.push(pt);
        }

        pendingTri.push(pt);
      }
    } else if (!pendingTri.some((p) => dist(p, pt) < 0.015) && pendingTri.length === 2) {
      if (!points.some((p) => dist(p, pt) < 0.015)) {
        points.push(pt);
      }

      triangles.push([pendingTri[0], pendingTri[1], pt]);
      pendingTri = [];
    }
  }

  draw();
});

toolButtons.point.addEventListener('click', () => setTool('point'));
toolButtons.line.addEventListener('click', () => setTool('line'));
toolButtons.triangle.addEventListener('click', () => setTool('triangle'));
clearButton.addEventListener('click', clearAll);

window.addEventListener('keydown', (e) => {
  if (e.key === '1') {
    setTool('point');
  } else if (e.key === '2') {
    setTool('line');
  } else if (e.key === '3') {
    setTool('triangle');
  } else if (e.key === 'Escape') {
    cancelPending();
  }
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);

(function seed() {
  const p1 = [0.0, -0.55];
  const p2 = [-0.48, 0.35];
  const p3 = [0.48, 0.35];

  points.push(p1, p2, p3);
  triangles.push([p1, p2, p3]);
  draw();
})();
