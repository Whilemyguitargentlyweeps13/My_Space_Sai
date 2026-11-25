const canvas = document.querySelector("#workspace-canvas");
const stage = document.querySelector("#workspace-stage");
if (!canvas || !stage) throw new Error("The workspace scene is missing its canvas.");

const context = canvas.getContext("2d", { alpha: true });
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const faces = [];
const palette = {
  wood: "#bd7843", lightWood: "#dfa56c", darkWood: "#765038", wall: "#f3e7d2",
  green: "#245d46", deepGreen: "#123d32", orange: "#ed550b", cream: "#fff3de",
  metal: "#7a8580", black: "#212323", screen: "#193f37", skin: "#c47b4f",
  shirt: "#e9dfcb", pants: "#292a2a", red: "#d74d30", blue: "#64a6b1",
};

const vec = (x, y, z) => [x, y, z];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a) => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};

function addFace(vertices, color, normal) {
  faces.push({ vertices, color, normal: normalize(normal) });
}

function addBox(cx, cy, cz, width, height, depth, color) {
  const x0 = cx - width / 2, x1 = cx + width / 2;
  const y0 = cy - height / 2, y1 = cy + height / 2;
  const z0 = cz - depth / 2, z1 = cz + depth / 2;
  const p = (x, y, z) => vec(x, y, z);
  addFace([p(x0,y1,z0),p(x1,y1,z0),p(x1,y1,z1),p(x0,y1,z1)], color, vec(0,1,0));
  addFace([p(x0,y0,z1),p(x1,y0,z1),p(x1,y0,z0),p(x0,y0,z0)], color, vec(0,-1,0));
  addFace([p(x0,y0,z1),p(x0,y1,z1),p(x0,y1,z0),p(x0,y0,z0)], color, vec(-1,0,0));
  addFace([p(x1,y0,z0),p(x1,y1,z0),p(x1,y1,z1),p(x1,y0,z1)], color, vec(1,0,0));
  addFace([p(x1,y0,z1),p(x1,y1,z1),p(x0,y1,z1),p(x0,y0,z1)], color, vec(0,0,1));
  addFace([p(x0,y0,z0),p(x0,y1,z0),p(x1,y1,z0),p(x1,y0,z0)], color, vec(0,0,-1));
}

function addBeam(start, end, radius, color, segments = 7) {
  const axis = normalize(sub(end, start));
  const helper = Math.abs(axis[1]) > 0.88 ? vec(1,0,0) : vec(0,1,0);
  const u = normalize(cross(axis, helper));
  const v = normalize(cross(axis, u));
  const ringA = [], ringB = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const offset = add(mul(u, Math.cos(angle) * radius), mul(v, Math.sin(angle) * radius));
    ringA.push(add(start, offset));
    ringB.push(add(end, offset));
  }
  addFace(ringA.slice().reverse(), color, mul(axis, -1));
  addFace(ringB, color, axis);
  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments;
    const mid = normalize(add(u, v));
    addFace([ringA[i], ringA[next], ringB[next], ringB[i]], color, mid);
  }
}

function addSphere(cx, cy, cz, rx, ry, rz, color, segments = 10, rings = 6) {
  for (let ring = 0; ring < rings; ring += 1) {
    const phi0 = (ring / rings) * Math.PI;
    const phi1 = ((ring + 1) / rings) * Math.PI;
    for (let segment = 0; segment < segments; segment += 1) {
      const theta0 = (segment / segments) * Math.PI * 2;
      const theta1 = ((segment + 1) / segments) * Math.PI * 2;
      const point = (phi, theta) => vec(
        cx + rx * Math.sin(phi) * Math.cos(theta),
        cy + ry * Math.cos(phi),
        cz + rz * Math.sin(phi) * Math.sin(theta),
      );
      const a = point(phi0, theta0), b = point(phi1, theta0);
      const c = point(phi1, theta1), d = point(phi0, theta1);
      const n1 = normalize(vec((a[0]+b[0]+c[0])/3-cx, (a[1]+b[1]+c[1])/3-cy, (a[2]+b[2]+c[2])/3-cz));
      const n2 = normalize(vec((a[0]+c[0]+d[0])/3-cx, (a[1]+c[1]+d[1])/3-cy, (a[2]+c[2]+d[2])/3-cz));
      if (ring > 0) addFace([a,b,c], color, n1);
      if (ring < rings - 1) addFace([a,c,d], color, n2);
    }
  }
}

function buildRoom() {
  // Floating cutaway plinth and warm plank floor.
  addBox(0, -0.12, 0, 9.3, 0.3, 6.4, palette.cream);
  addBox(0, 0.04, 0, 9.05, 0.08, 6.15, palette.wood);
  for (let i = 0; i < 12; i += 1) {
    const z = -2.9 + i * 0.52;
    addBox(0, 0.09, z, 8.98, 0.025, 0.48, i % 2 ? palette.lightWood : palette.wood);
  }
  addBox(0, 2.9, -3.08, 9.1, 5.7, 0.18, palette.wall);
  addBox(-4.48, 2.9, 0, 0.18, 5.7, 6.2, "#e5d7bd");
  addBox(0, 0.02, 3.05, 9.05, 0.1, 0.16, palette.cream);

  // Back wall picture window, trim, and sunset panes.
  addBox(-2.6, 3.45, -2.96, 2.35, 2.45, 0.05, palette.cream);
  addBox(-2.6, 3.45, -2.92, 2.05, 2.15, 0.04, "#e78836");
  addBox(-2.6, 3.45, -2.88, 0.09, 2.17, 0.04, palette.cream);
  addBox(-2.6, 3.45, -2.87, 2.08, 0.09, 0.04, palette.cream);
  addBox(-2.6, 4.0, -2.85, 2.02, 0.045, 0.04, "#f3c177");

  // Green door and wall details.
  addBox(3.6, 1.65, -2.94, 1.45, 3.25, 0.07, palette.darkWood);
  addBox(3.6, 1.65, -2.88, 1.22, 3.0, 0.06, palette.green);
  addBox(3.6, 2.27, -2.83, 0.8, 0.95, 0.04, "#9fb58a");
  addBox(3.6, 2.27, -2.8, 0.07, 0.95, 0.04, palette.cream);
  addBox(3.6, 2.27, -2.8, 0.78, 0.07, 0.04, palette.cream);
  addSphere(4.05, 1.4, -2.77, 0.07, 0.07, 0.07, palette.orange, 8, 5);
  addBox(1.65, 3.95, -2.94, 1.3, 1.5, 0.04, "#dcc8a8");
  addBox(1.65, 3.95, -2.9, 1.1, 1.3, 0.04, "#f7efe1");
  addBox(1.65, 4.17, -2.86, 0.76, 0.035, 0.035, palette.orange);
  addBox(1.65, 3.86, -2.86, 0.84, 0.035, 0.035, palette.green);

  // Shelves, books, and storage boxes across the back wall.
  for (const y of [3.35, 4.35]) {
    addBox(-0.45, y, -2.56, 3.5, 0.17, 0.84, palette.lightWood);
    addBox(-2.12, y + 0.32, -2.61, 0.14, 0.52, 0.76, palette.wood);
    addBox(1.22, y + 0.32, -2.61, 0.14, 0.52, 0.76, palette.wood);
  }
  const bookColors = [palette.orange, "#406d85", "#d5b14b", "#9a533a", "#243e37", "#d7c1a1"];
  for (let i = 0; i < 11; i += 1) {
    const x = -1.85 + i * 0.25;
    addBox(x, 3.7 + (i % 3) * 0.035, -2.48, 0.17, 0.57 + (i % 4) * 0.05, 0.36, bookColors[i % bookColors.length]);
  }
  for (let i = 0; i < 4; i += 1) {
    addBox(0.15 + i * 0.24, 4.75, -2.5, 0.16, 0.6 + (i % 2) * 0.08, 0.37, bookColors[(i + 2) % bookColors.length]);
  }
  addBox(2.15, 4.66, -2.52, 0.95, 0.43, 0.56, "#a0784f");
  addBox(2.15, 4.68, -2.47, 0.68, 0.26, 0.03, "#332b24");

  // Work desk with drawer, tower, two monitors, small speakers, and a keyboard.
  addBox(0.0, 1.78, 0.35, 3.35, 0.16, 1.45, palette.lightWood);
  for (const x of [-1.48, 1.48]) for (const z of [-0.2, 0.9]) addBox(x, 0.96, z, 0.12, 1.55, 0.12, palette.darkWood);
  addBox(-1.04, 1.5, 0.36, 0.72, 0.36, 1.12, palette.wood);
  addBox(-1.04, 1.56, 0.94, 0.6, 0.055, 0.025, "#e5b77b");
  addBox(-0.2, 2.43, -0.15, 1.18, 0.82, 0.12, palette.black);
  addBox(-0.2, 2.43, -0.075, 1.03, 0.64, 0.025, palette.screen);
  addBox(1.03, 2.31, -0.15, 0.82, 0.65, 0.12, palette.black);
  addBox(1.03, 2.31, -0.075, 0.69, 0.49, 0.025, "#234a46");
  for (let i = 0; i < 5; i += 1) {
    addBox(-0.52 + (i % 2) * 0.43, 2.57 - Math.floor(i / 2) * 0.12, -0.05, 0.26, 0.025, 0.015, i % 2 ? "#72b786" : "#e2a84b");
    addBox(0.77 + (i % 2) * 0.28, 2.44 - Math.floor(i / 2) * 0.1, -0.05, 0.16, 0.02, 0.015, i % 2 ? "#72b786" : "#e2a84b");
  }
  addBox(-0.2, 1.99, -0.12, 0.09, 0.28, 0.09, palette.metal);
  addBox(1.03, 1.99, -0.12, 0.08, 0.25, 0.08, palette.metal);
  addBox(-0.05, 1.91, 0.42, 0.92, 0.045, 0.32, palette.black);
  for (let i = 0; i < 11; i += 1) addBox(-0.46 + i * 0.08, 1.94, 0.42, 0.025, 0.01, 0.2, "#8c9790");
  for (const x of [-1.65, 1.75]) {
    addBox(x, 2.15, 0.12, 0.38, 0.55, 0.38, palette.black);
    addSphere(x, 2.18, 0.325, 0.13, 0.13, 0.035, "#a9b0a9", 8, 5);
    addSphere(x, 2.18, 0.36, 0.055, 0.055, 0.02, palette.black, 8, 5);
  }
  addBox(2.4, 0.7, 0.2, 0.58, 1.28, 0.72, palette.black);
  addBox(2.4, 0.7, 0.57, 0.23, 0.75, 0.04, palette.deepGreen);
  addSphere(2.4, 0.88, 0.62, 0.16, 0.16, 0.04, "#328a79", 8, 5);

  // Seat and green task chair.
  addBox(0.0, 1.1, 2.0, 0.92, 0.18, 0.86, palette.green);
  addBox(0.0, 1.8, 2.38, 0.82, 1.12, 0.18, palette.deepGreen);
  addBeam(vec(0,1.0,2.0), vec(0,0.48,2.0), 0.07, palette.metal, 8);
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    addBeam(vec(0,0.48,2.0), vec(Math.cos(a)*0.55,0.18,2.0+Math.sin(a)*0.55), 0.035, palette.metal, 6);
    addSphere(Math.cos(a)*0.55,0.14,2.0+Math.sin(a)*0.55,0.1,0.07,0.1,palette.black,7,4);
  }

  // Piano and keys along the left wall.
  addBox(-3.5, 1.18, -0.4, 1.55, 2.28, 0.78, palette.black);
  addBox(-3.5, 2.34, -0.02, 1.32, 0.13, 0.5, palette.darkWood);
  addBox(-3.5, 2.43, -0.34, 1.45, 0.08, 0.16, palette.wood);
  addBox(-3.5, 0.64, 0.08, 1.55, 0.15, 0.62, palette.black);
  for (let i = 0; i < 15; i += 1) addBox(-4.17 + i * 0.095, 0.73, 0.39, 0.085, 0.08, 0.34, "#f6eddf");
  for (let i = 0; i < 10; i += 1) if (i % 3 !== 1) addBox(-4.12 + i * 0.14, 0.79, 0.22, 0.055, 0.08, 0.18, palette.black);
  addBox(-3.5, 1.71, -0.04, 1.23, 0.58, 0.035, "#e8ddc8");
  for (let i = 0; i < 4; i += 1) addBox(-3.5, 1.55 + i * 0.1, 0.0, 0.82, 0.018, 0.012, palette.darkWood);

  // Drums, stands, and cymbals.
  addSphere(-3.45, 0.65, 2.15, 0.77, 0.62, 0.3, "#27684f", 10, 6);
  addSphere(-3.45, 0.65, 2.48, 0.55, 0.43, 0.06, "#c9d0c1", 10, 6);
  addSphere(-4.12, 1.1, 2.18, 0.36, 0.27, 0.28, palette.green, 9, 5);
  addSphere(-2.76, 1.1, 2.15, 0.34, 0.27, 0.27, palette.green, 9, 5);
  addSphere(-3.5, 1.45, 2.2, 0.35, 0.26, 0.3, palette.green, 9, 5);
  for (const [x,z,y] of [[-4.3,1.8,1.75],[-2.55,2.35,1.65],[-3.0,2.85,1.6]]) {
    addBeam(vec(x,y,z), vec(x,0.13,z), 0.025, palette.metal, 6);
    addSphere(x,y,z,0.58,0.055,0.36,"#c4a85d",10,4);
    addBeam(vec(x-0.18,y+0.08,z), vec(x+0.18,y+0.08,z), 0.018, palette.metal, 5);
  }
  addBox(-4.1, 0.28, 2.82, 0.4, 0.5, 0.4, palette.wood);

  // Hanging guitar and a couple of studio objects.
  addSphere(4.0, 2.55, -2.76, 0.26, 0.38, 0.09, "#a65b2f", 10, 6);
  addSphere(4.0, 2.62, -2.65, 0.1, 0.16, 0.025, palette.darkWood, 8, 5);
  addBeam(vec(4.0,2.82,-2.74), vec(4.0,3.75,-2.74), 0.055, palette.darkWood, 7);
  addSphere(-4.0, 2.1, -1.0, 0.24, 0.32, 0.18, "#324642", 8, 5);
  addBox(-4.0, 2.25, -0.85, 0.33, 0.2, 0.18, palette.orange);
  for (let i = 0; i < 5; i += 1) addBeam(vec(3.4 + i*0.17,2.9,-2.2), vec(3.6 + i*0.17,2.3,-2.2), 0.025, i%2?palette.wood:palette.metal, 5);

  // Desk lamp and a small potted plant.
  addBeam(vec(-1.9,1.9,0.1), vec(-1.9,2.55,0.1), 0.035, palette.black, 6);
  addBeam(vec(-1.9,2.55,0.1), vec(-1.58,2.78,0.1), 0.035, palette.black, 6);
  addSphere(-1.52,2.76,0.1,0.2,0.12,0.18,palette.orange,8,4);
  addBox(1.93, 1.91, 0.54, 0.36, 0.32, 0.36, "#c78254");
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2;
    addBeam(vec(1.93,2.05,0.54), vec(1.93+Math.cos(a)*0.23,2.55+(i%2)*0.12,0.54+Math.sin(a)*0.23), 0.055, i%2?palette.green:"#438052", 6);
  }

  // Stylized 3D Sai, seated on the upper shelf with a guitar.
  const hip = vec(2.75, 4.43, 1.23);
  addBox(2.75, 4.54, 1.22, 0.69, 0.25, 0.5, palette.pants);
  addBox(2.75, 5.08, 1.2, 0.66, 0.84, 0.42, palette.shirt);
  addSphere(2.75, 5.79, 1.18, 0.31, 0.37, 0.3, palette.skin, 11, 7);
  addSphere(2.75, 6.02, 1.18, 0.32, 0.2, 0.31, "#252321", 10, 5);
  addSphere(2.47, 5.82, 1.18, 0.1, 0.14, 0.12, "#252321", 8, 4);
  addSphere(2.6, 5.89, 1.44, 0.035, 0.035, 0.025, palette.black, 7, 4);
  addSphere(2.9, 5.89, 1.44, 0.035, 0.035, 0.025, palette.black, 7, 4);
  addBeam(vec(2.48,4.55,1.2), vec(2.38,3.95,1.94), 0.16, palette.pants, 7);
  addBeam(vec(3.02,4.55,1.2), vec(3.13,3.95,1.94), 0.16, palette.pants, 7);
  addBeam(vec(2.38,3.95,1.94), vec(2.37,3.87,1.12), 0.13, palette.pants, 7);
  addBeam(vec(3.13,3.95,1.94), vec(3.12,3.87,1.12), 0.13, palette.pants, 7);
  addSphere(2.37,3.83,1.08,0.2,0.1,0.27,palette.black,8,5);
  addSphere(3.12,3.83,1.08,0.2,0.1,0.27,palette.black,8,5);
  // Guitar body and neck rest across his lap; hands meet the strings.
  addSphere(2.76,4.93,1.55,0.43,0.3,0.13,"#a55c30",10,6);
  addSphere(2.76,4.91,1.69,0.13,0.13,0.03,palette.darkWood,8,5);
  addBeam(vec(2.95,5.06,1.55), vec(3.77,5.39,1.55), 0.07, palette.darkWood, 7);
  addBox(3.81,5.42,1.55,0.22,0.12,0.15,palette.darkWood);
  addBeam(vec(2.46,5.28,1.35), vec(2.65,4.99,1.62), 0.085, palette.skin, 7);
  addBeam(vec(3.04,5.27,1.35), vec(3.08,5.34,1.53), 0.085, palette.skin, 7);
  addBox(2.75, 4.18, 1.18, 1.2, 0.16, 0.85, palette.lightWood);
}

buildRoom();

function shadeColor(hex, factor) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((value >> 16) & 255) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((value >> 8) & 255) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((value & 255) * factor)));
  return `rgb(${r}, ${g}, ${b})`;
}

function renderRoom(width, height, yaw, pitch) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const target = vec(0, 2.65, 0);
  const distance = 15.5;
  const azimuth = 0.79 + yaw;
  const elevation = 0.62 + pitch;
  const camera = vec(
    Math.sin(azimuth) * Math.cos(elevation) * distance,
    2.7 + Math.sin(elevation) * distance,
    Math.cos(azimuth) * Math.cos(elevation) * distance,
  );
  const forward = normalize(sub(target, camera));
  const right = normalize(cross(forward, vec(0, 1, 0)));
  const up = normalize(cross(right, forward));
  const focal = Math.min(width, height) * 2.05;
  const light = normalize(vec(-0.45, 0.84, 0.3));

  const project = (point) => {
    const relative = sub(point, camera);
    const depth = dot(relative, forward);
    const safeDepth = Math.max(0.2, depth);
    return {
      x: width / 2 + dot(relative, right) * focal / safeDepth,
      y: height * 0.56 - dot(relative, up) * focal / safeDepth,
      depth,
    };
  };

  // A soft pool of shadow sits under the model before the room geometry is painted.
  const shadow = context.createRadialGradient(width * 0.52, height * 0.84, 2, width * 0.52, height * 0.84, width * 0.34);
  shadow.addColorStop(0, "rgba(32, 20, 12, .34)");
  shadow.addColorStop(1, "rgba(32, 20, 12, 0)");
  context.fillStyle = shadow;
  context.fillRect(0, height * 0.64, width, height * 0.36);

  const drawFaces = faces.map((face) => {
    const projected = face.vertices.map(project);
    const depth = projected.reduce((sum, vertex) => sum + vertex.depth, 0) / projected.length;
    const illumination = 0.55 + Math.max(0, dot(face.normal, light)) * 0.5;
    return { ...face, projected, depth, fill: shadeColor(face.color, illumination) };
  }).filter((face) => face.depth > 0.1).sort((a, b) => b.depth - a.depth);

  context.lineJoin = "round";
  for (const face of drawFaces) {
    context.beginPath();
    context.moveTo(face.projected[0].x, face.projected[0].y);
    for (let i = 1; i < face.projected.length; i += 1) context.lineTo(face.projected[i].x, face.projected[i].y);
    context.closePath();
    context.fillStyle = face.fill;
    context.fill();
    context.strokeStyle = "rgba(28, 34, 27, .17)";
    context.lineWidth = Math.max(0.55, width / 1200);
    context.stroke();
  }
}

let box = stage.getBoundingClientRect();
let currentYaw = 0, currentPitch = 0, targetYaw = 0, targetPitch = 0;
let shake = 0, shakePhase = 0, animationId = 0;

function paint() {
  const { width, height } = stage.getBoundingClientRect();
  if (width < 2 || height < 2) return;
  box = { width, height };
  renderRoom(width, height, currentYaw + Math.sin(shakePhase) * shake * 0.035, currentPitch + Math.cos(shakePhase * 0.8) * shake * 0.02);
}

function animate() {
  animationId = 0;
  currentYaw += (targetYaw - currentYaw) * 0.12;
  currentPitch += (targetPitch - currentPitch) * 0.12;
  shake *= 0.88;
  shakePhase += 0.24;
  paint();
  if (Math.abs(targetYaw - currentYaw) > 0.001 || Math.abs(targetPitch - currentPitch) > 0.001 || shake > 0.012) {
    animationId = requestAnimationFrame(animate);
  }
}

function requestPaint() {
  if (!animationId) animationId = requestAnimationFrame(animate);
}

function pointToTilt(event) {
  if (motionPreference.matches || (event.pointerType === "touch" && event.buttons === 0)) return;
  const rect = stage.getBoundingClientRect();
  const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  targetYaw = Math.max(-0.18, Math.min(0.18, nx * 0.16));
  targetPitch = Math.max(-0.12, Math.min(0.12, -ny * 0.09));
  requestPaint();
}

function resetTilt() {
  targetYaw = 0;
  targetPitch = 0;
  requestPaint();
}

if (context) {
  stage.classList.add("scene-ready");
  stage.addEventListener("pointermove", pointToTilt, { passive: true });
  stage.addEventListener("pointerleave", resetTilt, { passive: true });
  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") pointToTilt(event);
    shake = 1;
    requestPaint();
  }, { passive: true });
  stage.addEventListener("pointerup", resetTilt, { passive: true });
  window.addEventListener("resize", () => { paint(); }, { passive: true });
  motionPreference.addEventListener?.("change", () => {
    if (motionPreference.matches) resetTilt();
  });
  paint();
} else {
  stage.classList.remove("scene-ready");
}
