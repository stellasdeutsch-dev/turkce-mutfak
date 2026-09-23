/* 3D-кухня: three.js, собственная камера (горизонтальный свайп крутит кухню,
   вертикальный — скроллит страницу), тап по предмету → событие kitchen:pick. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const host = document.getElementById('kitchen');
const wrap = host.querySelector('.k-canvas');
const pinsLayer = host.querySelector('.k-pins');
const WORDS = window.KITCHEN.words;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  host.classList.add('no-webgl');
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
wrap.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#F4EEDF');
scene.fog = new THREE.Fog('#F4EEDF', 16, 30);
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

/* ---------- свет ---------- */
scene.add(new THREE.HemisphereLight('#fffaf0', '#e6d3bd', 1.25));
const sun = new THREE.DirectionalLight('#fff1dc', 1.7);
sun.position.set(4.5, 8, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 22 });
sun.shadow.bias = -0.0008;
sun.shadow.radius = 4;
scene.add(sun);

/* ---------- помощники ---------- */
const C = {
  wall: '#FBF6EA', floorA: '#F3EADB', floorB: '#FBF6EC', peach: '#F9B99A', peachL: '#FFD2BA',
  counter: '#FFFBED', yellow: '#FFD866', yellowL: '#FFE083', blue: '#1A8CFF', ink: '#1C1C1C',
  steel: '#E3E8EE', steelD: '#9AA3AD', wood: '#E3B07A', woodD: '#C88D55', white: '#FFFFFF',
  red: '#E0473B', copper: '#D2844A', tea: '#B4471F', bread: '#D99A52', enamel: '#FF9C7A'
};
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({
  // без карты окружения сильный металл выглядит чёрным — держим его «сатиновым»
  color, roughness: o.m ? Math.max(o.r ?? 0.72, 0.38) : (o.r ?? 0.72), metalness: Math.min(o.m ?? 0, 0.3), transparent: !!o.t, opacity: o.t ?? 1,
  map: o.map || null, emissive: '#000000'
});
const rbox = (w, h, d, r = 0.035) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));
function mesh(geo, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
function tileTexture(a, b, n = 2, grout = null, px = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  const s = px / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = (i + j) % 2 ? a : b;
    g.fillRect(i * s, j * s, s, s);
    if (grout) { g.strokeStyle = grout; g.lineWidth = 3; g.strokeRect(i * s, j * s, s, s); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
/* невидимая, но кликабельная оболочка — чтобы мелочь было легко нажать пальцем */
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
function hit(group, w, h, d, y = h / 2) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat);
  m.position.y = y;
  m.userData.hitbox = true;
  group.add(m);
}

/* ---------- кликабельные предметы ---------- */
const items = new Map(); // id -> { groups:[], anchor:Vector3 }
function item(id, x, y, z, anchorY) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.userData.id = id;
  scene.add(g);
  const rec = items.get(id) || { groups: [], anchor: new THREE.Vector3(x, y + anchorY, z) };
  rec.groups.push(g);
  items.set(id, rec);
  return g;
}

/* ---------- комната ---------- */
const floorTex = tileTexture(C.floorA, C.floorB, 2);
floorTex.repeat.set(9, 7);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), mat('#ffffff', { map: floorTex, r: 0.9 }));
floor.rotation.x = -Math.PI / 2;
floor.position.set(0.3, 0, 0.25);
floor.receiveShadow = true;
scene.add(floor);

const wallM = mat(C.wall, { r: 0.95 });
const back = mesh(new THREE.BoxGeometry(8.7, 3.3, 0.1), wallM, 0.3, 1.65, -3.05); back.castShadow = false;
const left = mesh(new THREE.BoxGeometry(0.1, 3.3, 7), wallM, -4.05, 1.65, 0.25); left.castShadow = false;
scene.add(back, left);
// плинтус
mesh(new THREE.BoxGeometry(8.7, 0.08, 0.04), mat(C.peach), 0.3, 0.04, -2.99, scene);

// фартук из плитки
const spTex = tileTexture('#FFD9C4', '#FFE4D4', 4, '#FFF6EE', 256);
spTex.repeat.set(10, 1);
const splash = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 0.62), mat('#ffffff', { map: spTex, r: 0.5 }));
splash.position.set(-0.8, 1.23, -2.995);
scene.add(splash);
const spTex2 = spTex.clone(); spTex2.repeat.set(4.2, 1); spTex2.needsUpdate = true;
const splash2 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.62), mat('#ffffff', { map: spTex2, r: 0.5 }));
splash2.rotation.y = Math.PI / 2;
splash2.position.set(-3.995, 1.23, -1.7);
scene.add(splash2);

// окно с небом
const skyTex = new THREE.TextureLoader().load('media/sky2.webp');
skyTex.colorSpace = THREE.SRGBColorSpace;
const win = new THREE.Group();
win.position.set(-0.6, 2.05, -2.99);
scene.add(win);
mesh(rbox(1.36, 0.98, 0.06, 0.03), mat(C.white), 0, 0, 0, win);
mesh(new THREE.PlaneGeometry(1.2, 0.82), new THREE.MeshBasicMaterial({ map: skyTex }), 0, 0, 0.035, win).castShadow = false;
mesh(new THREE.BoxGeometry(0.035, 0.84, 0.03), mat(C.white), 0, 0, 0.05, win);
mesh(new THREE.BoxGeometry(1.46, 0.05, 0.16), mat(C.white), 0, -0.5, 0.06, win);

/* ---------- столешница (tezgâh) и нижние шкафы ---------- */
const CT_Y = 0.86;           // верх шкафов
const TOP = CT_Y + 0.06;     // верх столешницы
{
  // задний ряд: x -3.95 … 2.3
  const g = item('tezgah', -0.825, CT_Y, -2.67, 0.25);
  mesh(rbox(6.3, 0.06, 0.7, 0.02), mat(C.counter, { r: 0.35 }), 0, 0.03, 0, g);
  // левый ряд вдоль стены: z -2.32 … 0.2
  const g2 = item('tezgah', -3.64, CT_Y, -1.06, 0.25);
  mesh(rbox(0.7, 0.06, 2.52, 0.02), mat(C.counter, { r: 0.35 }), 0, 0.03, 0, g2);
}
{
  // нижние шкафы — dolap
  const doorM = () => mat(C.peachL, { r: 0.6 });
  const back = item('dolap', -0.825, 0, -2.69, 0.95);
  mesh(new THREE.BoxGeometry(6.26, CT_Y, 0.62), mat(C.peach), 0, CT_Y / 2, 0, back);
  // фасады кроме зоны духовки
  for (const [x, w] of [[-3.45, 0.9], [-2.5, 0.9], [-1.55, 0.9], [-0.6, 0.9], [0.35, 0.8], [2.02, 0.5]]) {
    const cx = x + 0.825;
    mesh(rbox(w - 0.05, CT_Y - 0.12, 0.03, 0.02), doorM(), cx, CT_Y / 2 + 0.03, 0.325, back);
    mesh(rbox(0.22, 0.025, 0.03, 0.01), mat(C.ink, { r: 0.4 }), cx, CT_Y - 0.16, 0.35, back);
  }
  const lft = item('dolap', -3.66, 0, -0.55, 0.95);
  mesh(new THREE.BoxGeometry(0.62, CT_Y, 1.5), mat(C.peach), 0, CT_Y / 2, 0, lft);
  for (const z of [-0.37, 0.37]) {
    mesh(rbox(0.03, CT_Y - 0.12, 0.7, 0.02), doorM(), 0.325, CT_Y / 2 + 0.03, z, lft);
    mesh(rbox(0.03, 0.025, 0.22, 0.01), mat(C.ink, { r: 0.4 }), 0.35, CT_Y - 0.16, z, lft);
  }
  // корпус под посудомойкой
  const mid = item('dolap', -3.66, 0, -1.81, 0.95);
  mesh(new THREE.BoxGeometry(0.62, CT_Y, 1.02), mat(C.peach), 0, CT_Y / 2, 0, mid);
  // верхние шкафы
  const up = item('dolap', -2.75, 1.72, -2.82, 0.9);
  mesh(rbox(2.3, 0.8, 0.36, 0.03), mat(C.peach), 0, 0.4, 0, up);
  for (const x of [-0.86, -0.29, 0.29, 0.86]) {
    mesh(rbox(0.54, 0.72, 0.03, 0.02), doorM(), x, 0.4, 0.19, up);
    mesh(rbox(0.025, 0.2, 0.03, 0.01), mat(C.ink, { r: 0.4 }), x + (x < 0 ? 0.2 : -0.2), 0.22, 0.215, up);
  }
}

/* ---------- духовка + плита + вытяжка ---------- */
{
  const f = item('firin', 1.3, 0, -2.36, 0.62);
  mesh(rbox(0.8, CT_Y - 0.06, 0.04, 0.02), mat('#2A2A2E', { r: 0.25 }), 0, CT_Y / 2, 0, f);
  mesh(rbox(0.62, 0.34, 0.02, 0.02), mat('#141418', { r: 0.1, m: 0.2 }), 0, 0.38, 0.025, f);
  mesh(rbox(0.6, 0.03, 0.04, 0.012), mat(C.steel, { m: 0.8, r: 0.3 }), 0, 0.64, 0.06, f);
  for (const x of [-0.27, -0.09, 0.09, 0.27]) {
    const k = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 18), mat(C.steel, { m: 0.7, r: 0.3 }), x, 0.76, 0.04, f);
    k.rotation.x = Math.PI / 2;
  }
  hit(f, 0.82, 0.84, 0.2, 0.42);
}
{
  const o = item('ocak', 1.3, TOP, -2.66, 0.12);
  mesh(rbox(0.82, 0.02, 0.58, 0.02), mat('#18181B', { r: 0.2, m: 0.1 }), 0, 0.01, 0, o);
  for (const [x, z] of [[-0.2, 0.12], [0.2, 0.12], [-0.2, -0.14], [0.2, -0.14]]) {
    const ring = mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 32), mat('#55555C', { r: 0.4 }), x, 0.025, z, o);
    ring.rotation.x = Math.PI / 2;
  }
  hit(o, 0.84, 0.05, 0.6, 0.02);
}
{
  const h = item('davlumbaz', 1.3, 1.95, -2.72, 0.75);
  const hood = mesh(new THREE.CylinderGeometry(0.28, 0.6, 0.42, 4, 1), mat(C.steel, { m: 0.55, r: 0.35 }), 0, 0.21, 0, h);
  hood.rotation.y = Math.PI / 4;
  hood.scale.set(1, 1, 0.62);
  mesh(new THREE.BoxGeometry(0.34, 0.95, 0.3), mat(C.steel, { m: 0.55, r: 0.35 }), 0, 0.88, -0.05, h);
  mesh(new THREE.BoxGeometry(0.72, 0.03, 0.02), mat(C.blue), 0, 0.03, 0.26, h);
}

/* ---------- мойка и кран ---------- */
{
  const e = item('evye', -0.6, TOP, -2.64, 0.12);
  mesh(rbox(0.74, 0.02, 0.5, 0.02), mat(C.steel, { m: 0.8, r: 0.25 }), 0, 0.01, 0, e);
  mesh(rbox(0.62, 0.012, 0.38, 0.02), mat('#8E969F', { m: 0.8, r: 0.35 }), 0, 0.02, 0, e);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 16), mat('#5A6068', { m: 0.8 }), 0, 0.028, 0, e);
  hit(e, 0.76, 0.06, 0.52, 0.02);
}
{
  const m = item('musluk', -0.6, TOP, -2.93, 0.45);
  const st = mat(C.steel, { m: 0.9, r: 0.2 });
  mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.04, 20), st, 0, 0.02, 0, m);
  mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 16), st, 0, 0.2, 0, m);
  const arc = mesh(new THREE.TorusGeometry(0.11, 0.022, 10, 24, Math.PI), st, 0, 0.37, 0.11, m);
  arc.rotation.y = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.07, 16), st, 0, 0.34, 0.22, m);
  mesh(rbox(0.12, 0.02, 0.025, 0.01), st, 0.06, 0.1, 0.01, m);
  hit(m, 0.24, 0.5, 0.36, 0.25);
}

/* ---------- на плите: çaydanlık + demlik, tencere, tava ---------- */
function lathe(points, segs = 36) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segs);
}
{
  const g = item('caydanlik', 1.1, TOP + 0.02, -2.54, 0.34);
  const body = mat(C.steel, { m: 0.85, r: 0.22 });
  mesh(lathe([[0, 0], [0.13, 0], [0.16, 0.05], [0.165, 0.14], [0.14, 0.24], [0.1, 0.27], [0.0, 0.27]]), body, 0, 0, 0, g);
  const sp = mesh(new THREE.CylinderGeometry(0.014, 0.03, 0.18, 12), body, 0.17, 0.14, 0, g);
  sp.rotation.z = -0.9;
  const hd = mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 24, Math.PI), mat(C.ink, { r: 0.5 }), 0, 0.27, 0, g);
  hd.rotation.y = Math.PI / 2;
  hit(g, 0.4, 0.3, 0.36, 0.15);
}
{
  const g = item('demlik', 1.1, TOP + 0.29, -2.54, 0.26);
  const body = mat(C.steel, { m: 0.85, r: 0.18 });
  mesh(lathe([[0, 0], [0.07, 0], [0.1, 0.04], [0.105, 0.11], [0.08, 0.16], [0.0, 0.16]]), body, 0, 0, 0, g);
  mesh(new THREE.SphereGeometry(0.025, 16, 12), mat(C.ink), 0, 0.18, 0, g);
  const sp = mesh(new THREE.CylinderGeometry(0.01, 0.02, 0.12, 10), body, 0.11, 0.09, 0, g);
  sp.rotation.z = -0.85;
  const hd = mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 18, Math.PI), mat(C.ink, { r: 0.5 }), -0.1, 0.09, 0, g);
  hd.rotation.z = Math.PI / 2;
  hit(g, 0.3, 0.22, 0.26, 0.1);
}
{
  const g = item('tencere', 1.5, TOP + 0.02, -2.8, 0.34);
  const en = mat(C.enamel, { r: 0.45 });
  mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.2, 32), en, 0, 0.1, 0, g);
  mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.02, 32), mat(C.peachL, { r: 0.4 }), 0, 0.21, 0, g);
  mesh(new THREE.SphereGeometry(0.03, 16, 12), mat(C.ink), 0, 0.235, 0, g);
  for (const s of [-1, 1]) mesh(rbox(0.06, 0.025, 0.05, 0.01), mat(C.ink), s * 0.19, 0.16, 0, g);
  hit(g, 0.44, 0.3, 0.36, 0.14);
}
{
  const g = item('tava', 1.52, TOP + 0.02, -2.5, 0.16);
  mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.045, 32), mat('#26262B', { r: 0.35, m: 0.3 }), 0, 0.023, 0, g);
  mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.004, 32), mat('#FFD866', { r: 0.6 }), 0, 0.045, 0, g); // яичница :)
  mesh(new THREE.SphereGeometry(0.035, 16, 10), mat('#FFB020', { r: 0.4 }), 0.02, 0.05, 0.01, g).scale.y = 0.5;
  const hd = mesh(rbox(0.04, 0.025, 0.26, 0.01), mat(C.ink), 0.03, 0.045, 0.24, g);
  hd.rotation.x = -0.12;
  hit(g, 0.34, 0.14, 0.62, 0.05);
}
{
  const g = item('cezve', 2.02, TOP, -2.62, 0.25);
  const cu = mat(C.copper, { m: 0.75, r: 0.3 });
  mesh(lathe([[0, 0], [0.06, 0], [0.055, 0.06], [0.045, 0.1], [0.06, 0.13], [0.0, 0.13]], 24), cu, 0, 0, 0, g);
  const hd = mesh(rbox(0.025, 0.02, 0.2, 0.008), mat(C.woodD), 0, 0.1, 0.13, g);
  hd.rotation.x = -0.35;
  hit(g, 0.2, 0.2, 0.42, 0.08);
}

/* ---------- кухонная мелочь на столешнице ---------- */
{
  const g = item('kesme-tahtasi', -1.95, TOP, -2.62, 0.12);
  mesh(rbox(0.52, 0.03, 0.34, 0.02), mat(C.wood, { r: 0.8 }), 0, 0.015, 0, g);
  mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 16), mat(C.woodD), -0.21, 0.03, 0, g).rotation.x = Math.PI / 2;
  // пара кружков помидора на доске
  for (const [x, z] of [[0.12, -0.08], [0.18, 0.03]]) mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 18), mat(C.red, { r: 0.5 }), x, 0.036, z, g);
  hit(g, 0.54, 0.06, 0.36, 0.02);
}
{
  const g = item('bicak', -2.0, TOP + 0.035, -2.6, 0.14);
  g.rotation.y = 0.35;
  mesh(new THREE.BoxGeometry(0.26, 0.006, 0.05), mat(C.steel, { m: 0.95, r: 0.15 }), 0.05, 0.006, 0, g);
  mesh(rbox(0.13, 0.022, 0.035, 0.01), mat(C.ink, { r: 0.5 }), -0.14, 0.012, 0, g);
  hit(g, 0.46, 0.08, 0.14, 0.03);
}
{
  const g = item('mikrodalga', -3.3, TOP, -2.72, 0.5);
  mesh(rbox(0.66, 0.38, 0.42, 0.04), mat('#F2F2F0', { r: 0.4 }), 0, 0.19, 0, g);
  mesh(rbox(0.42, 0.27, 0.02, 0.02), mat('#1E2126', { r: 0.1, m: 0.2 }), -0.07, 0.19, 0.21, g);
  mesh(rbox(0.12, 0.3, 0.02, 0.02), mat('#DADADA', { r: 0.5 }), 0.24, 0.19, 0.21, g);
  mesh(rbox(0.08, 0.03, 0.02, 0.01), mat(C.blue), 0.24, 0.29, 0.225, g);
}

/* ---------- посудомойка и мусорка ---------- */
{
  const g = item('bulasik-makinesi', -3.33, 0, -1.72, 0.95);
  mesh(rbox(0.04, CT_Y - 0.06, 0.6, 0.02), mat('#EEF0F3', { r: 0.35, m: 0.1 }), 0, CT_Y / 2, 0, g);
  mesh(rbox(0.045, 0.07, 0.5, 0.02), mat('#1C1C1C', { r: 0.3 }), 0.005, CT_Y - 0.1, 0, g);
  mesh(rbox(0.05, 0.015, 0.06, 0.008), mat(C.blue), 0.01, CT_Y - 0.1, 0.15, g);
  mesh(rbox(0.04, 0.025, 0.36, 0.01), mat(C.steel, { m: 0.8, r: 0.3 }), 0.045, CT_Y - 0.22, 0, g);
  hit(g, 0.2, 0.86, 0.62, 0.43);
}
{
  const g = item('cop-kutusu', -3.55, 0, 0.95, 0.75);
  mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.56, 32), mat(C.steel, { m: 0.8, r: 0.3 }), 0, 0.28, 0, g);
  mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.05, 32), mat(C.ink, { r: 0.4 }), 0, 0.585, 0, g);
  mesh(rbox(0.12, 0.02, 0.1, 0.008), mat(C.ink), 0, 0.02, 0.2, g);
}

/* ---------- холодильник ---------- */
{
  const g = item('buzdolabi', 3.05, 0, -2.6, 2.2);
  mesh(rbox(0.92, 2.05, 0.74, 0.08), mat(C.yellowL, { r: 0.45 }), 0, 1.025, 0, g);
  mesh(new THREE.BoxGeometry(0.9, 0.015, 0.01), mat('#E2BE4E'), 0, 1.36, 0.372, g);
  for (const [y, h] of [[1.62, 0.36], [0.95, 0.5]]) mesh(rbox(0.04, h, 0.05, 0.02), mat(C.ink, { r: 0.35 }), -0.35, y, 0.39, g);
  // магниты на двери
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.015, 16), mat(C.blue), 0.12, 1.7, 0.38, g).rotation.x = Math.PI / 2;
  mesh(rbox(0.12, 0.09, 0.012, 0.01), mat(C.enamel), 0.2, 1.5, 0.38, g);
  mesh(rbox(0.09, 0.12, 0.012, 0.01), mat(C.white), 0.02, 1.55, 0.378, g);
}

/* ---------- стол, стулья, всё на столе ---------- */
const TX = 1.25, TZ = 0.75, TY = 0.78;
{
  const g = item('masa', TX, 0, TZ, 0.95);
  mesh(rbox(1.9, 0.07, 1.15, 0.035), mat(C.yellow, { r: 0.55 }), 0, TY - 0.035, 0, g);
  for (const [x, z] of [[-0.82, -0.46], [0.82, -0.46], [-0.82, 0.46], [0.82, 0.46]]) {
    mesh(new THREE.CylinderGeometry(0.03, 0.025, TY - 0.07, 12), mat(C.ink, { r: 0.4 }), x, (TY - 0.07) / 2, z, g);
  }
}
function chair(x, z, rotY) {
  const g = item('sandalye', x, 0, z, 1.05);
  g.rotation.y = rotY;
  const cm = mat(C.blue, { r: 0.5 });
  mesh(rbox(0.5, 0.06, 0.48, 0.03), cm, 0, 0.46, 0, g);
  mesh(rbox(0.5, 0.5, 0.05, 0.03), cm, 0, 0.74, -0.22, g);
  for (const [lx, lz] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) {
    mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.44, 10), mat(C.ink, { r: 0.4 }), lx, 0.22, lz, g);
  }
}
chair(TX - 0.45, TZ + 0.9, Math.PI);
chair(TX + 0.45, TZ - 0.9, 0);
{
  const g = item('tabak', TX - 0.35, TY, TZ + 0.12, 0.2);
  mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.03, 40), mat(C.white, { r: 0.3 }), 0, 0.015, 0, g);
  mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.004, 40), mat('#F4F1EA', { r: 0.3 }), 0, 0.031, 0, g);
  // menemen в тарелке
  mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.012, 24), mat('#E8683E', { r: 0.6 }), 0, 0.036, 0, g);
  for (const [x, z] of [[0.04, 0.02], [-0.05, -0.03], [0.0, -0.06]]) mesh(new THREE.SphereGeometry(0.025, 12, 8), mat('#FFD34E'), x, 0.045, z, g).scale.y = 0.4;
}
{
  const g = item('kasik', TX - 0.35 + 0.29, TY, TZ + 0.12, 0.14);
  const st = mat(C.steel, { m: 0.9, r: 0.2 });
  mesh(rbox(0.022, 0.008, 0.2, 0.004), st, 0, 0.006, 0.06, g);
  mesh(new THREE.SphereGeometry(0.04, 16, 10), st, 0, 0.01, -0.07, g).scale.set(0.8, 0.25, 1.2);
  hit(g, 0.12, 0.08, 0.34, 0.03);
}
{
  const g = item('catal', TX - 0.35 - 0.29, TY, TZ + 0.12, 0.14);
  const st = mat(C.steel, { m: 0.9, r: 0.2 });
  mesh(rbox(0.022, 0.008, 0.2, 0.004), st, 0, 0.006, 0.06, g);
  for (const x of [-0.018, -0.006, 0.006, 0.018]) mesh(new THREE.BoxGeometry(0.006, 0.006, 0.09), st, x, 0.006, -0.08, g);
  hit(g, 0.12, 0.08, 0.34, 0.03);
}
{
  const g = item('cay-bardagi', TX + 0.3, TY, TZ + 0.28, 0.3);
  mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.012, 32), mat(C.red, { r: 0.4 }), 0, 0.006, 0, g);
  const glass = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.05, transmission: 0.6, thickness: 0.02, transparent: true, opacity: 0.45 });
  mesh(lathe([[0, 0], [0.032, 0], [0.042, 0.03], [0.026, 0.07], [0.034, 0.1], [0.044, 0.135], [0.0, 0.135]], 28), glass, 0, 0.012, 0, g).castShadow = false;
  mesh(lathe([[0, 0], [0.028, 0], [0.037, 0.03], [0.022, 0.068], [0.029, 0.1], [0.0, 0.1]], 28), mat(C.tea, { r: 0.2, t: 0.92 }), 0, 0.016, 0, g);
  // чайная ложечка
  const sp = mesh(rbox(0.012, 0.006, 0.1, 0.003), mat(C.steel, { m: 0.9, r: 0.2 }), 0.06, 0.016, 0.02, g);
  sp.rotation.y = 0.6;
  hit(g, 0.18, 0.2, 0.18, 0.08);
}
{
  const g = item('tuz', TX + 0.02, TY, TZ - 0.28, 0.24);
  mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.1, 20), mat(C.white, { r: 0.2 }), 0, 0.05, 0, g);
  mesh(new THREE.SphereGeometry(0.031, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.steel, { m: 0.8, r: 0.3 }), 0, 0.1, 0, g);
  hit(g, 0.12, 0.16, 0.12, 0.07);
}
{
  const g = item('ekmek', TX + 0.52, TY, TZ - 0.1, 0.24);
  mesh(rbox(0.36, 0.02, 0.22, 0.01), mat(C.wood), 0, 0.01, 0, g);
  const loaf = mesh(new THREE.CapsuleGeometry(0.075, 0.16, 6, 16), mat(C.bread, { r: 0.85 }), 0, 0.075, 0, g);
  loaf.rotation.z = Math.PI / 2;
  loaf.scale.set(1, 1, 0.8);
  for (const x of [-0.06, 0, 0.06]) mesh(new THREE.BoxGeometry(0.012, 0.01, 0.1), mat('#F2C98A'), x, 0.14, 0, g).rotation.y = 0.5;
}

/* ---------- выбор, подсветка, кольцо ---------- */
const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 48), new THREE.MeshBasicMaterial({ color: C.blue, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2;
scene.add(ring);
let ringT = 1;

const meshesOf = (id) => {
  const out = [];
  items.get(id)?.groups.forEach((g) => g.traverse((o) => { if (o.isMesh && !o.userData.hitbox) out.push(o); }));
  return out;
};
function setGlow(id, amount) {
  if (!id) return;
  for (const m of meshesOf(id)) {
    if (!m.material.emissive) continue;
    m.material.emissive.set(C.blue);
    m.material.emissiveIntensity = amount;
  }
}
let selected = null, hovered = null, bounceT = 1;

// метки там, где их не перекрывают соседи
items.get('dolap').anchor.set(-2.75, 2.6, -2.82);
items.get('tezgah').anchor.set(-3.64, 1.02, -0.55);

/* ---------- метки над предметами ---------- */
const pins = new Map();
const pinW = new Map();
for (const w of WORDS) {
  if (!items.has(w.id)) continue;
  const b = document.createElement('button');
  b.className = 'k-pin';
  b.type = 'button';
  b.textContent = w.tr;
  b.dataset.id = w.id;
  b.addEventListener('click', (e) => { e.stopPropagation(); pick(w.id, 'pin'); });
  pinsLayer.appendChild(b);
  pins.set(w.id, b);
}

/* ---------- камера ---------- */
const view = { theta: 0.62, phi: 1.02, r: 9, shift: 0, target: new THREE.Vector3(-0.2, 0.8, -0.85) };
const goal = { theta: view.theta, phi: view.phi, r: view.r, shift: 0, target: view.target.clone() };
const LIM = { tMin: -0.12, tMax: 1.55, pMin: 0.55, pMax: 1.3, rMin: 3.6, rMax: 15 };
let baseR = 9;
function homeR() {
  const a = wrap.clientWidth / Math.max(1, wrap.clientHeight);
  return a < 0.75 ? 18.5 : a < 1.1 ? 12.5 : 9.2;
}
// в портретной ориентации смотрим по диагонали — так Г-образная кухня влезает в узкий экран
const portrait = () => wrap.clientWidth / Math.max(1, wrap.clientHeight) < 0.9;
const homeTheta = () => (portrait() ? 0.8 : 0.62);
const homeTarget = (v) => (portrait() ? v.set(0.45, 0.75, -0.7) : v.set(-0.2, 0.8, -0.85));
let first = true;
function applyCamera() {
  const s = Math.sin(view.phi);
  camera.position.set(
    view.target.x + view.r * s * Math.sin(view.theta),
    view.target.y + view.r * Math.cos(view.phi),
    view.target.z + view.r * s * Math.cos(view.theta)
  );
  camera.lookAt(view.target);
}
function resize() {
  const w = wrap.clientWidth, h = wrap.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const nr = homeR();
  if (!selected) goal.r = nr;
  baseR = nr;
  if (first) { first = false; view.r = goal.r; view.theta = goal.theta = homeTheta(); homeTarget(goal.target); view.target.copy(goal.target); }
  pinW.clear();
}
new ResizeObserver(resize).observe(wrap);

/* ---------- ввод: свайп, тап, наведение ---------- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let down = null, lastInteract = performance.now(), dragged = false;
const el = renderer.domElement;
el.style.touchAction = 'pan-y';

function idAt(clientX, clientY) {
  const r = el.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(scene.children, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.id) o = o.parent;
    if (o) return o.userData.id;
  }
  return null;
}
el.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now(), theta: goal.theta, phi: goal.phi, type: e.pointerType };
  dragged = false;
  lastInteract = performance.now();
});
window.addEventListener('pointermove', (e) => {
  if (down) {
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.abs(dx) > 6 || (down.type === 'mouse' && Math.abs(dy) > 6)) {
      if (!dragged) host.classList.add('k-dragged');
      dragged = true;
    }
    if (dragged) {
      goal.theta = THREE.MathUtils.clamp(down.theta - dx * 0.0065, LIM.tMin, LIM.tMax);
      if (down.type === 'mouse') goal.phi = THREE.MathUtils.clamp(down.phi - dy * 0.004, LIM.pMin, LIM.pMax);
      lastInteract = performance.now();
    }
    return;
  }
  if (e.pointerType !== 'mouse' || e.target !== el) return;
  const id = idAt(e.clientX, e.clientY);
  if (id !== hovered) {
    if (hovered && hovered !== selected) setGlow(hovered, 0);
    hovered = id;
    if (hovered && hovered !== selected) setGlow(hovered, 0.18);
    el.style.cursor = id ? 'pointer' : 'grab';
  }
});
window.addEventListener('pointerup', (e) => {
  if (!down) return;
  const wasDrag = dragged;
  down = null;
  if (wasDrag || e.target !== el) return;
  const id = idAt(e.clientX, e.clientY);
  if (id) pick(id, 'tap');
});
window.addEventListener('pointercancel', () => { down = null; });
el.addEventListener('pointerleave', () => { if (hovered && hovered !== selected) setGlow(hovered, 0); hovered = null; });

/* ---------- публичный API ---------- */
function pick(id, source) {
  host.dispatchEvent(new CustomEvent('kitchen:pick', { detail: { id, source } }));
}
function focus(id, { zoom = true } = {}) {
  const rec = items.get(id);
  if (!rec) return;
  if (selected && selected !== id) setGlow(selected, 0);
  selected = id;
  setGlow(id, 0.16);
  pins.forEach((p, k) => p.classList.toggle('on', k === id));
  bounceT = 0;
  ringT = 0;
  ring.position.set(rec.groups[0].position.x, rec.groups[0].position.y + 0.012, rec.groups[0].position.z);
  if (zoom) {
    goal.target.set(rec.anchor.x, Math.max(0.5, rec.anchor.y - 0.35), rec.anchor.z);
    goal.r = THREE.MathUtils.clamp(baseR * (portrait() ? 0.5 : 0.6), LIM.rMin, LIM.rMax);
    // на телефоне карточка слова закрывает низ — поднимаем предмет в верхнюю часть кадра
    goal.shift = portrait() ? 0.24 : 0;
  }
  lastInteract = performance.now();
}
function reset() {
  if (selected) setGlow(selected, 0);
  selected = null;
  pins.forEach((p) => p.classList.remove('on'));
  homeTarget(goal.target);
  goal.shift = 0;
  goal.theta = homeTheta();
  goal.phi = 1.02;
  goal.r = baseR;
}
function zoom(f) { goal.r = THREE.MathUtils.clamp(goal.r * f, LIM.rMin, LIM.rMax); lastInteract = performance.now(); }
function rotate(d) { goal.theta = THREE.MathUtils.clamp(goal.theta + d, LIM.tMin, LIM.tMax); lastInteract = performance.now(); }
function flash(id, ok) {
  for (const m of meshesOf(id)) {
    if (!m.material.emissive) continue;
    m.material.emissive.set(ok ? '#18B85A' : '#FF3B30');
    m.material.emissiveIntensity = 0.5;
  }
  setTimeout(() => { if (id === selected) setGlow(id, 0.16); else setGlow(id, 0); }, 650);
}
window.Kitchen3D = { focus, reset, zoom, rotate, flash, ids: [...items.keys()] };
host.classList.add('ready');
host.dispatchEvent(new CustomEvent('kitchen:ready'));

/* ---------- цикл рендера (только когда видно) ---------- */
let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }, { rootMargin: '100px' }).observe(host);
const tmp = new THREE.Vector3();
let running = false, t0 = performance.now();
function loop() {
  if (running) return;
  running = true;
  requestAnimationFrame(frame);
}
function frame(now) {
  if (!visible) { running = false; return; }
  const dt = Math.min(0.05, (now - t0) / 1000);
  t0 = now;
  // лёгкое «дыхание» камеры, пока никто не трогает
  const idle = !reduceMotion && now - lastInteract > 3500 && !down;
  const sway = idle ? Math.sin(now / 2600) * 0.06 : 0;
  const k = 1 - Math.pow(0.001, dt);
  view.theta += (goal.theta + sway - view.theta) * k;
  view.phi += (goal.phi - view.phi) * k;
  view.r += (goal.r - view.r) * k;
  view.target.lerp(goal.target, k);
  view.shift += (goal.shift - view.shift) * k;
  const cw = wrap.clientWidth, ch = wrap.clientHeight;
  if (Math.abs(view.shift) > 0.001) camera.setViewOffset(cw, ch, 0, ch * view.shift, cw, ch);
  else if (camera.view && camera.view.enabled) camera.clearViewOffset();
  applyCamera();

  if (selected && bounceT < 1) {
    bounceT = Math.min(1, bounceT + dt * 1.8);
    const s = 1 + Math.sin(bounceT * Math.PI * 3) * 0.08 * (1 - bounceT);
    items.get(selected).groups.forEach((g) => g.scale.setScalar(s));
  }
  if (ringT < 1) {
    ringT = Math.min(1, ringT + dt * 0.9);
    ring.scale.setScalar(1 + ringT * 2.2);
    ring.material.opacity = 0.75 * (1 - ringT);
  }
  renderer.render(scene, camera);

  if (host.classList.contains('labels')) {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    // проекция + «разгрузка»: если метки налезают, ближняя к камере остаётся, дальняя прячется
    const list = [];
    for (const [id, p] of pins) {
      tmp.copy(items.get(id).anchor).project(camera);
      const off = tmp.z > 1 || tmp.x < -1.05 || tmp.x > 1.05 || tmp.y < -1.05 || tmp.y > 1.05;
      if (!pinW.has(id)) pinW.set(id, p.offsetWidth || 60);
      list.push({ id, p, x: ((tmp.x + 1) / 2) * w, y: ((1 - tmp.y) / 2) * h, z: tmp.z, off });
    }
    list.sort((a, b) => (a.id === selected ? -1 : b.id === selected ? 1 : a.z - b.z));
    const placed = [];
    for (const it of list) {
      const pw = pinW.get(it.id), ph = 26;
      const r = { l: it.x - pw / 2, r: it.x + pw / 2, t: it.y - ph, b: it.y };
      const clash = placed.some((q) => r.l < q.r + 2 && r.r > q.l - 2 && r.t < q.b + 2 && r.b > q.t - 2);
      const hide = it.off || (clash && it.id !== selected);
      it.p.style.opacity = hide ? 0 : '';
      it.p.style.pointerEvents = hide ? 'none' : '';
      if (!hide) placed.push(r);
      it.p.style.transform = `translate3d(${it.x}px, ${it.y}px, 0) translate(-50%, -100%)`;
    }
  }
  requestAnimationFrame(frame);
}
resize();
applyCamera();
loop();

/* ---------- 3D-иконки предметов: рендерим каждый предмет отдельно в PNG ---------- */
function thumbGroup(id) {
  const rec = items.get(id);
  if (id === 'tezgah') {
    // кусок столешницы с тумбой вместо длинной полосы
    const g = new THREE.Group();
    mesh(new THREE.BoxGeometry(1.0, CT_Y, 0.6), mat(C.peach), 0, CT_Y / 2, 0, g);
    mesh(rbox(0.9, CT_Y - 0.12, 0.03, 0.02), mat(C.peachL, { r: 0.6 }), 0, CT_Y / 2 + 0.03, 0.31, g);
    mesh(rbox(1.1, 0.06, 0.7, 0.02), mat(C.counter, { r: 0.35 }), 0, CT_Y + 0.03, 0, g);
    return g;
  }
  const src = id === 'dolap' ? rec.groups[rec.groups.length - 1] : rec.groups[0];
  const g = src.clone(true);
  g.position.set(0, 0, 0);
  g.scale.setScalar(1);
  if (id === 'evye') {
    const m = items.get('musluk').groups[0].clone(true);
    m.position.set(0, 0, -0.29);
    g.add(m);
  }
  return g;
}
function heroGroup() {
  const g = new THREE.Group();
  const k = items.get('caydanlik').groups[0].clone(true); k.position.set(0, 0, 0);
  const d = items.get('demlik').groups[0].clone(true); d.position.set(0, 0.27, 0);
  const b = items.get('cay-bardagi').groups[0].clone(true); b.position.set(0.3, 0, 0.16); b.scale.setScalar(1.25);
  g.add(k, d, b);
  return g;
}
function renderThumbs() {
  let r2;
  try { r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return; }
  r2.outputColorSpace = THREE.SRGBColorSpace;
  r2.setPixelRatio(1);
  r2.setClearColor(0x000000, 0);
  const s2 = new THREE.Scene();
  s2.add(new THREE.HemisphereLight('#fffaf0', '#e6d3bd', 1.4));
  const l2 = new THREE.DirectionalLight('#fff1dc', 1.8);
  l2.position.set(3, 6, 5);
  s2.add(l2);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
  const box = new THREE.Box3(), tmpBox = new THREE.Box3(), c = new THREE.Vector3(), sz = new THREE.Vector3();
  const dir = new THREE.Vector3(0.75, 0.62, 1).normalize();
  const out = {};
  const jobs = [['__hero', heroGroup, 640], ...WORDS.filter((w) => items.has(w.id)).map((w) => [w.id, () => thumbGroup(w.id), 220])];
  let i = 0;
  function one() {
    if (i >= jobs.length) {
      r2.dispose();
      window.Kitchen3D.thumbs = out;
      host.dispatchEvent(new CustomEvent('kitchen:thumbs', { detail: out }));
      return;
    }
    const [id, make, px] = jobs[i++];
    const g = make();
    s2.add(g);
    g.updateMatrixWorld(true);
    box.makeEmpty();
    g.traverse((o) => { if (o.isMesh && !o.userData.hitbox) { tmpBox.setFromObject(o); box.union(tmpBox); } });
    box.getCenter(c); box.getSize(sz);
    const rad = sz.length() / 2;
    const dist = rad / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2)) * 1.02;
    cam.position.copy(c).addScaledVector(dir, dist);
    cam.near = dist / 50; cam.far = dist * 4;
    cam.updateProjectionMatrix();
    cam.lookAt(c);
    r2.setSize(px, px, false);
    r2.render(s2, cam);
    out[id] = r2.domElement.toDataURL('image/png');
    s2.remove(g);
    // по одной иконке за кадр — чтобы не подвешивать страницу
    (window.requestIdleCallback || ((f) => setTimeout(f, 16)))(one);
  }
  one();
}
setTimeout(renderThumbs, 400);
