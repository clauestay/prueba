// Variables globales para el reproductor
const musicContainer = document.getElementById("music-container");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const playBtn = document.getElementById("play");
const audio = document.getElementById("audio");
const progress = document.getElementById("progress");
const progressContainer = document.getElementById("progress-container");
const title = document.getElementById("title");
const cover = document.getElementById("cover");

const songs = [
  "La canción de la muerte",
  "La mea tona 1",
  "I got you",
  "Helicóptero",
  "La mea tona 2",
  "La mea tona 3",
  "Puro terror",
  "I see you",
  "Terror",
  "La mea tona 4",
  "La mea tona 5"
];

const cancionesMax = ["Helicoptero", "La mea tona 1", "La mea tona 2", "La mea tona 3", "La mea tona 4", "La mea tona 5"];
const cancionesLore = ["I got you", "I see you"];
const cancionesMaxLore = ["La canción de la muerte", "Puro terror", "Terror"];

let songIndex = 0;

function loadSong(song) {
  if (!title || !audio) return;
  title.innerText = song;
  audio.src = `recursos/audios/${song}.mp3`;

  if (cancionesMax.includes(song)) {
    cover.src = "recursos/imagenes/DiscoMax.png";
  } else if (cancionesLore.includes(song)) {
    cover.src = "recursos/imagenes/DiscoYo.png";
  } else if (cancionesMaxLore.includes(song)) {
    cover.src = "recursos/imagenes/DiscoMezcla.png";
  }
}

function updatePlayIcon(isPlaying) {
  const icon = playBtn.querySelector('i');
  if (icon) {
    if (isPlaying) {
      icon.className = 'fas fa-pause';
    } else {
      icon.className = 'fas fa-play';
    }
  }
}

function playSong() {
  if (!musicContainer || !audio) return;
  musicContainer.classList.add("play");
  updatePlayIcon(true);
  audio.play().catch(e => console.error("Error al reproducir audio:", e));
}

function pauseSong() {
  if (!musicContainer || !audio) return;
  musicContainer.classList.remove("play");
  updatePlayIcon(false);
  audio.pause();
}

function togglePlay() {
  const isPlaying = musicContainer.classList.contains("play");
  if (isPlaying) {
    pauseSong();
  } else {
    playSong();
  }
}

function prevSong() {
  songIndex--;
  if (songIndex < 0) songIndex = songs.length - 1;
  loadSong(songs[songIndex]);
  playSong();
}

function nextSong() {
  songIndex++;
  if (songIndex > songs.length - 1) songIndex = 0;
  loadSong(songs[songIndex]);
  playSong();
}

function updateProgress(e) {
  const { duration, currentTime } = e.srcElement;
  if (!isNaN(duration)) {
    const progressPercent = (currentTime / duration) * 100;
    progress.style.width = `${progressPercent}%`;
  }
}

function setProgress(e) {
  const width = this.clientWidth;
  const clickX = e.offsetX;
  const duration = audio.duration;
  if (!isNaN(duration)) {
    audio.currentTime = (clickX / width) * duration;
  }
}

// Inicialización
loadSong(songs[songIndex]);

// Eventos
if (playBtn) {
  playBtn.onclick = function () {
    togglePlay();
  };
}

if (prevBtn) prevBtn.onclick = prevSong;
if (nextBtn) nextBtn.onclick = nextSong;

if (audio) {
  audio.ontimeupdate = updateProgress;
  audio.onended = nextSong;
}

if (progressContainer) {
  progressContainer.onclick = setProgress;
}
const playMusic = togglePlay;
