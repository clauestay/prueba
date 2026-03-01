// --- Variables de Estado del Museo ---
let container, light, camera, scene, renderer, raycaster, mouse;
let centerLight; // Luz central para efectos
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

  // Ajuste dinámico del zoom: si la imagen es muy ancha (como el título),
  // nos alejamos proporcionalmente para que se vea completa.
  const objWidth = selectedObject.geometry.parameters.width;
  const offset = objWidth > 100 ? (objWidth * 0.7) : 50;

  const rot = selectedObject.rotation.y;

  // Cálculo de posición objetivo basado en la rotación del cuadro
  targetPos = new THREE.Vector3(
    selectedObject.position.x + (Math.abs(rot - Math.PI / 2) < 0.1 ? offset : Math.abs(rot + Math.PI / 2) < 0.1 ? -offset : 0),
    camera.position.y,
    selectedObject.position.z + (Math.abs(rot) < 0.1 ? offset : Math.abs(rot - Math.PI) < 0.1 ? -offset : 0)
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

  // Efecto de parpadeo macabro (foco en mal estado) en la luz principal
  if (centerLight) {
    const time = Date.now() * 0.005;
    centerLight.intensity = 0.6 + (Math.sin(time) * 0.04) + (Math.random() * 0.02);
  }

  if (camPos == null) {
    // Rotación libre
    const [currRot, targetRot] = unwrap([camera.rotation.y, targetRotation], Math.PI * 2);
    const diff = targetRot - currRot;
    if (Math.abs(diff) > 0.002) {
      camera.rotation.y += diff * 0.06;
      if (Math.abs(camera.rotation.y) > Math.PI * 2) camera.rotation.y %= Math.PI * 2;
    }
  } else {
    // Movimiento hacia cuadro (Acelerado a 0.06 para mejor respuesta)
    camera.position.lerp(targetPos, 0.06);
    camera.rotation.y = lerp(camera.rotation.y, destinyRotation, 0.06);

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

  // Agregar niebla (Fog) Lineal: Deja el frente 100% nítido y esconde sólo lo que está más lejos de 250 bloques
  scene.fog = new THREE.Fog(0x000000, 200, 600);

  // Luz ambiental más fuerte para recuperar la visibilidad general que se perdió
  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambient);

  // Luz de rebote sutil para que el techo y suelo no se vean negros
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
  scene.add(hemiLight);

  // Luz tenue central para iluminar sutilmente la sala entera
  centerLight = new THREE.PointLight(0x5555bb, 0.6, 500);
  centerLight.position.set(-150, 40, 20);
  scene.add(centerLight);

  // Suelo
  const loader = new THREE.TextureLoader();
  const floorTex = loader.load("recursos/imagenes/suelo3.jpg");
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(15, 10);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    side: THREE.DoubleSide,
    roughness: 0.8,
    bumpMap: floorTex,
    bumpScale: 0.05
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), floorMat);
  floor.receiveShadow = true;
  floor.position.y = -40;
  floor.rotation.x = Math.PI / 2;
  scene.add(floor);

  // Techo
  const ceilTex = loader.load("recursos/imagenes/cielo.jpg");
  ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
  ceilTex.repeat.set(40, 40);
  const ceilMat = new THREE.MeshStandardMaterial({
    map: ceilTex,
    side: THREE.DoubleSide,
    roughness: 0.9
  });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(1050, 1000), ceilMat);
  ceil.receiveShadow = true;
  ceil.position.y = 47;
  ceil.rotation.x = Math.PI / 2;
  scene.add(ceil);

  // Paredes
  const wallTex = loader.load("recursos/imagenes/pared1.jpg");
  const wallTex3 = loader.load("recursos/imagenes/pared3.jpg");
  // La pared frontal la ponemos en negro puro para que el logo JPG se funda perfectamente
  const wallMatFront = new THREE.MeshStandardMaterial({ color: 0x000000, side: THREE.DoubleSide, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, side: THREE.DoubleSide, roughness: 0.9, bumpMap: wallTex, bumpScale: 0.02 });
  const wallMat3 = new THREE.MeshStandardMaterial({ map: wallTex3, side: THREE.DoubleSide, roughness: 0.9, bumpMap: wallTex3, bumpScale: 0.02 });

  const wallGeom = new THREE.PlaneGeometry(600, 90);

  const wallFront = new THREE.Mesh(wallGeom, wallMatFront);
  wallFront.position.set(-150, 5, -230);
  wallFront.receiveShadow = true;
  scene.add(wallFront);

  const wallBack = new THREE.Mesh(wallGeom, wallMat);
  wallBack.position.set(-150, 5, 270);
  wallBack.receiveShadow = true;
  scene.add(wallBack);

  const wallRight = new THREE.Mesh(wallGeom, wallMat);
  wallRight.position.set(-370, 5, 0);
  wallRight.rotation.y = Math.PI / 2;
  wallRight.receiveShadow = true;
  scene.add(wallRight);

  const wallLeft = new THREE.Mesh(wallGeom, wallMat3);
  wallLeft.position.set(50, 5, 0);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.receiveShadow = true;
  scene.add(wallLeft);
}

function renderRoom() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Sombras y mapeo de color
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  requestAnimationFrame(animate);

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousedown", onDocumentMouseDown);
  document.addEventListener("touchstart", onDocumentTouchStart);
  document.addEventListener("touchmove", onDocumentTouchMove);
}

// --- Sistema de Arte ---
const textureLoader = new THREE.TextureLoader();

function addArt(width, x, z, rotation, texturePath, audioPath, description) {
  const tex = textureLoader.load(texturePath);

  // Identificar si es un texto (Logos, Títulos) o una pintura
  const isFlat = texturePath.includes("Titulo") || texturePath.includes("Logo") || texturePath.includes("descripcion");

  let mesh;
  let finalX = x;
  let finalZ = z;

  if (isFlat) {
    // Los textos no deben tener profundidad ni verse afectados por la oscuridad total
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, 30), mat);

    // Separación milimétrica para evitar parpadeos con la pared
    if (Math.abs(rotation) < 0.1) finalZ += 0.5;
    else if (Math.abs(rotation - Math.PI) < 0.1 || Math.abs(rotation + Math.PI) < 0.1) finalZ -= 0.5;
    else if (Math.abs(rotation - Math.PI / 2) < 0.1) finalX += 0.5;
    else if (Math.abs(rotation + Math.PI / 2) < 0.1) finalX -= 0.5;
  } else {
    // Es una pintura/foto normal
    // Mantendremos solo el plano de la imagen para que mantenga sus bordes blancos originales (si los tiene) y no se vea bloqueado
    const imgMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, 30), imgMat);

    // Desplazar sutilmente para evitar Z-fighting con la pared
    const offset = 1;
    if (Math.abs(rotation) < 0.1) finalZ += offset;
    else if (Math.abs(rotation - Math.PI) < 0.1 || Math.abs(rotation + Math.PI) < 0.1) finalZ -= offset;
    else if (Math.abs(rotation - Math.PI / 2) < 0.1) finalX += offset;
    else if (Math.abs(rotation + Math.PI / 2) < 0.1) finalX -= offset;

    mesh.position.set(finalX, 0, finalZ);
  }

  mesh.position.set(mesh.position.x || finalX, 0, mesh.position.z || finalZ);
  mesh.rotation.y = rotation;
  mesh.userData = [audioPath, description];

  scene.add(mesh);
  objects.push(mesh);

  // Añadir un Spotlight SÓLO para cuadros de arte, no para textos
  if (!isFlat) {
    const dirX = Math.sin(rotation);
    const dirZ = Math.cos(rotation);

    // Luz focal, aumento de intensidad para recuperar luz de la pared
    const spotLight = new THREE.SpotLight(0xfff5e6, 1.2); // Intensidad devuelta
    spotLight.position.set(finalX + dirX * 40, 25, finalZ + dirZ * 40);
    spotLight.target = mesh;
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.8;
    spotLight.decay = 2;
    spotLight.distance = 180;
    spotLight.castShadow = false;
    scene.add(spotLight);
  }
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
