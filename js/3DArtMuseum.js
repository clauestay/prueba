// --- Variables de Estado del Museo ---
let container, light, camera, scene, renderer, raycaster, mouse;
let objects = [];
let selectedObject, objectDescription;
let voiceGuide;
let voiceGuideVolume = 1;
let camPos = null;
let targetPos = null;
let targetRotation = 0;
let targetRotationOnMouseDown = 0;
let mouseX = 0;
let mouseXOnMouseDown = 0;
let destinyRotation = null;
let windowHalfX, windowHalfY;
let welcomeFile = "", welcomeText = "";

// --- Utilidades ---
const lerp = (v1, v2, alpha) => v1 + (v2 - v1) * Math.max(0, Math.min(1, alpha));
const smod = (x, m) => x - Math.floor(x / m + 0.5) * m;
const unwrap = (x, m, init = 0) => {
  let yi = init;
  return x.map(val => {
    yi += smod(val - yi, m);
    return yi;
  });
};

// --- Manejo del Museo (Entrada/Carga) ---
function startGallery() {
  const loadingScreen = document.getElementById("pleasewait");
  const enterBtn = document.getElementById("buttonenter");

  if (loadingScreen) loadingScreen.style.setProperty("display", "none", "important");
  if (enterBtn) enterBtn.style.setProperty("display", "none", "important");

  if (typeof playSong === 'function') {
    playSong();
  } else {
    const audioEl = document.getElementById("audio");
    if (audioEl) {
      audioEl.play().catch(e => console.warn("Audio autoplay bloqueado:", e));
      document.getElementById("music-container")?.classList.add("play");
    }
  }

  welcome("", "Bienvenido a la exposición virtual de arte de terror desarrollado por LoretoSoledad. Haga click o toque una obra de arte para acercarse a ella.");
}

// Bloqueo de interacción si el museo no ha empezado
const isLocked = () => document.getElementById("pleasewait")?.style.display !== "none";

// --- Eventos de Ventana y Mouse ---
function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseDown(event) {
  if (isLocked()) return;
  document.addEventListener("mousemove", onDocumentMouseMove, false);
  document.addEventListener("mouseup", onDocumentMouseUp, false);
  document.addEventListener("mouseout", onDocumentMouseOut, false);

  mouseXOnMouseDown = event.clientX - windowHalfX;
  targetRotationOnMouseDown = targetRotation;

  if (camPos == null) {
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objects);

    if (intersects.length > 0) {
      handleArtSelection(intersects[0].object);
    }
  }
}

function handleArtSelection(obj) {
  if (voiceGuide) voiceGuide.pause();
  document.getElementById("info").style.display = "none";
  selectedObject = obj;

  let cameraDegrees = ((camera.rotation.y * 180) / Math.PI);
  let objectDegrees = ((selectedObject.rotation.y * 180) / Math.PI);

  // Normalizar rotación de cámara
  if (cameraDegrees < -180) {
    camera.rotation.y = ((cameraDegrees + 360) % 360) * Math.PI / 180;
  } else if (cameraDegrees > 180 && objectDegrees !== 180) {
    camera.rotation.y = ((cameraDegrees - 360) % 360) * Math.PI / 180;
  }

  destinyRotation = (Math.round(objectDegrees) !== -180) ? selectedObject.rotation.y : (cameraDegrees < 0 ? -Math.PI : Math.PI);

  camPos = camera.position.clone();
  const offset = 50;
  const rot = selectedObject.rotation.y;

  // Cálculo de posición objetivo basado en la rotación del cuadro
  targetPos = new THREE.Vector3(
    selectedObject.position.x + (rot === Math.PI / 2 ? offset : rot === -Math.PI / 2 ? -offset : 0),
    camera.position.y,
    selectedObject.position.z + (rot === 0 ? offset : rot === Math.PI ? -offset : 0)
  );
}

function onDocumentMouseMove(event) {
  if (isLocked()) return;
  mouseX = event.clientX - windowHalfX;
  targetRotation = targetRotationOnMouseDown + (mouseX - mouseXOnMouseDown) * 0.0035;
}

function onDocumentMouseUp() {
  document.removeEventListener("mousemove", onDocumentMouseMove);
  document.removeEventListener("mouseup", onDocumentMouseUp);
  document.removeEventListener("mouseout", onDocumentMouseOut);
}

function onDocumentMouseOut() {
  onDocumentMouseUp();
}

function onDocumentTouchStart(event) {
  if (isLocked() || event.touches.length !== 1) return;
  mouseXOnMouseDown = event.touches[0].pageX - windowHalfX;
  targetRotationOnMouseDown = targetRotation;
}

function onDocumentTouchMove(event) {
  if (isLocked() || event.touches.length !== 1) return;
  mouseX = event.touches[0].pageX - windowHalfX;
  targetRotation = targetRotationOnMouseDown + (mouseX - mouseXOnMouseDown) * 0.002;
}

// --- Nucleo de Animación ---
function animate() {
  requestAnimationFrame(animate);

  if (camPos == null) {
    // Rotación libre
    const [currRot, targetRot] = unwrap([camera.rotation.y, targetRotation], Math.PI * 2);
    const diff = targetRot - currRot;
    if (Math.abs(diff) > 0.002) {
      camera.rotation.y += diff * 0.06;
      if (Math.abs(camera.rotation.y) > Math.PI * 2) camera.rotation.y %= Math.PI * 2;
    }
  } else {
    // Movimiento hacia cuadro
    camera.position.lerp(targetPos, 0.04);
    camera.rotation.y = lerp(camera.rotation.y, destinyRotation, 0.04);

    if (camera.position.distanceTo(targetPos) < 0.1 && Math.abs(camera.rotation.y - destinyRotation) < 0.01) {
      finishMovement();
    }
  }
  renderer.render(scene, camera);
}

function finishMovement() {
  camPos = null;
  targetPos = null;
  targetRotation = camera.rotation.y;

  if (voiceGuide) voiceGuide.pause();

  const audioPath = selectedObject.userData[0];
  const infoText = selectedObject.userData[1];

  if (audioPath) {
    voiceGuide = new Audio(audioPath);
    voiceGuide.onended = () => document.getElementById("info").style.display = "none";
    voiceGuide.volume = voiceGuideVolume;
    voiceGuide.play().catch(e => console.warn("Guía de voz bloqueada:", e));
  }

  if (infoText) {
    const infoEl = document.getElementById("info");
    const textEl = document.getElementById("infotext");
    infoEl.style.display = "block";
    textEl.innerHTML = infoText;
  }
}

// --- Construcción de la Escena ---
function drawRoom() {
  objects = [];
  container = document.getElementById("container");
  container.innerHTML = "";
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera = new THREE.PerspectiveCamera(37.8, window.innerWidth / window.innerHeight, 1, 100000);
  camera.position.set(0, 0, 195);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x222222, 1);
  scene.add(ambient);

  // Suelo
  const loader = new THREE.TextureLoader();
  const floorTex = loader.load("recursos/imagenes/suelo3.jpg");
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(15, 10);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial({ map: floorTex, side: THREE.DoubleSide }));
  floor.position.y = -40;
  floor.rotation.x = Math.PI / 2;
  scene.add(floor);

  // Techo
  const ceilTex = loader.load("recursos/imagenes/cielo.jpg");
  ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
  ceilTex.repeat.set(40, 40);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(1050, 1000), new THREE.MeshBasicMaterial({ map: ceilTex, side: THREE.DoubleSide }));
  ceil.position.y = 47;
  ceil.rotation.x = Math.PI / 2;
  scene.add(ceil);

  // Paredes
  const wallTex = loader.load("recursos/imagenes/pared1.jpg");
  const wallTex3 = loader.load("recursos/imagenes/pared3.jpg");
  const wallMat = new THREE.MeshBasicMaterial({ map: wallTex, side: THREE.DoubleSide });
  const wallMat3 = new THREE.MeshBasicMaterial({ map: wallTex3, side: THREE.DoubleSide });

  const wallGeom = new THREE.PlaneGeometry(600, 90);

  const wallFront = new THREE.Mesh(wallGeom, wallMat);
  wallFront.position.set(-150, 5, -230);
  scene.add(wallFront);

  const wallBack = new THREE.Mesh(wallGeom, wallMat);
  wallBack.position.set(-150, 5, 270);
  scene.add(wallBack);

  const wallRight = new THREE.Mesh(wallGeom, wallMat);
  wallRight.position.set(-370, 5, 0);
  wallRight.rotation.y = Math.PI / 2;
  scene.add(wallRight);

  const wallLeft = new THREE.Mesh(wallGeom, wallMat3);
  wallLeft.position.set(50, 5, 0);
  wallLeft.rotation.y = Math.PI / 2;
  scene.add(wallLeft);
}

function renderRoom() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  requestAnimationFrame(animate);

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousedown", onDocumentMouseDown);
  document.addEventListener("touchstart", onDocumentTouchStart);
  document.addEventListener("touchmove", onDocumentTouchMove);
}

// --- Sistema de Arte ---
function addArt(width, x, z, rotation, texturePath, audioPath, description) {
  const tex = new THREE.TextureLoader().load(texturePath);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, 30), mat);

  mesh.position.set(x, 0, z);
  mesh.rotation.y = rotation;
  mesh.userData = [audioPath, description];

  scene.add(mesh);
  objects.push(mesh);
}

// Aliases para compatibilidad con galeria.html
const addToFront = (w, x, tex, aud, desc) => addArt(w, x, -229, 0, tex, aud, desc);
const addToBack = (w, x, tex, aud, desc) => addArt(w, x, 269, Math.PI, tex, aud, desc);
const addToLeft = (w, z, tex, aud, desc) => addArt(w, -369, z, Math.PI / 2, tex, aud, desc);
const addToRight = (w, z, tex, aud, desc) => addArt(w, 49, z, -Math.PI / 2, tex, aud, desc);

function welcome(file, text) {
  welcomeFile = file;
  welcomeText = text;
  const infoEl = document.getElementById("info");
  const textEl = document.getElementById("infotext");
  if (infoEl && textEl) {
    infoEl.style.display = "block";
    textEl.innerHTML = text;
  }
}

document.getElementById("info").onclick = () => document.getElementById("info").style.display = "none";
document.getElementById("buttonenter").onclick = startGallery;
