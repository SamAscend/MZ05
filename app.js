"use strict";

const STORAGE_KEY = "milezero-one-night-v1";
const $ = (selector) => document.querySelector(selector);
const toast = $("#toast");
let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function loadScores() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { sprint: [], plank: null, jumps: [] };
    const parsed = JSON.parse(saved);
    return {
      sprint: Array.isArray(parsed.sprint) ? parsed.sprint.slice(0, 2) : [],
      plank: Number.isFinite(parsed.plank) ? parsed.plank : null,
      jumps: Array.isArray(parsed.jumps) ? parsed.jumps.slice(0, 3) : [],
    };
  } catch (error) {
    console.error("Tidak dapat membaca skor yang tersimpan.", error);
    return { sprint: [], plank: null, jumps: [] };
  }
}

let scores = loadScores();

function saveScores() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch (error) {
    console.error("Tidak dapat menyimpan skor challenge.", error);
    showToast("Skor tampil, tetapi tidak bisa disimpan di perangkat ini.");
  }
}

function formatClock(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((milliseconds % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function renderScores() {
  const sprintChips = $("#sprint-attempts").querySelectorAll(".attempt-chip");
  sprintChips.forEach((chip, index) => {
    chip.querySelector("b").textContent = scores.sprint[index] == null ? "—" : `${scores.sprint[index].toFixed(2)}s`;
  });
  const bestSprint = scores.sprint.length ? Math.min(...scores.sprint) : null;
  $("#sprint-best").innerHTML = bestSprint == null ? "—<small> sec</small>" : `${bestSprint.toFixed(2)}<small> sec</small>`;

  $("#plank-time").textContent = scores.plank == null ? "02:00" : formatDuration(scores.plank);
  if (scores.plank != null) {
    $("#plank-hint").textContent = "Hasil terbaik tersimpan.";
    $("#plank-progress-bar").style.width = `${Math.min(100, scores.plank / 120000 * 100)}%`;
    $("#plank-button").textContent = "SELESAI ✓";
    $("#plank-button").disabled = true;
  }

  const jumpChips = $("#jump-attempts").querySelectorAll(".attempt-chip");
  jumpChips.forEach((chip, index) => {
    chip.querySelector("b").textContent = scores.jumps[index] == null ? "—" : `${scores.jumps[index]}cm`;
  });
  const bestJump = scores.jumps.length ? Math.max(...scores.jumps) : null;
  $("#jump-best").innerHTML = bestJump == null ? "—<small> cm</small>" : `${bestJump}<small> cm</small>`;
  $("#sprint-button").disabled = scores.sprint.length >= 2;
  if (scores.sprint.length >= 2) $("#sprint-button").textContent = "2 ATTEMPTS DONE ✓";
  else if (sprintStartedAt == null) {
    $("#sprint-button").innerHTML = scores.sprint.length ? 'START ATTEMPT 02 <span>↗</span>' : 'START SPRINT <span>↗</span>';
  }
  $("#jump-button").disabled = scores.jumps.length >= 3;
  if (scores.jumps.length >= 3) $("#jump-button").textContent = "3 ATTEMPTS DONE ✓";
}

function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

let sprintStartedAt = null;
let sprintTimer = null;
$("#sprint-button").addEventListener("click", () => {
  const button = $("#sprint-button");
  if (sprintStartedAt == null) {
    sprintStartedAt = performance.now();
    button.innerHTML = 'STOP &amp; CATAT <span>■</span>';
    sprintTimer = setInterval(() => {
      $("#sprint-best").innerHTML = `${((performance.now() - sprintStartedAt) / 1000).toFixed(2)}<small> sec</small>`;
    }, 30);
    showToast("Timer mulai — tekan STOP saat sprint 50 m selesai.");
    return;
  }
  const elapsed = (performance.now() - sprintStartedAt) / 1000;
  clearInterval(sprintTimer);
  sprintStartedAt = null;
  scores.sprint.push(elapsed);
  saveScores();
  renderScores();
  showToast(`Sprint attempt ${scores.sprint.length} tercatat: ${elapsed.toFixed(2)} detik.`);
});

let plankStartedAt = null;
let plankElapsed = 0;
let plankTimer = null;
const plankButton = $("#plank-button");
plankButton.addEventListener("click", () => {
  if (plankStartedAt == null) {
    plankStartedAt = Date.now() - plankElapsed;
    plankButton.textContent = "SELESAI / STOP";
    $("#plank-hint").textContent = "Timer berjalan — hentikan kalau form mulai berubah.";
    plankTimer = setInterval(() => {
      plankElapsed = Math.min(120000, Date.now() - plankStartedAt);
      $("#plank-time").textContent = formatDuration(120000 - plankElapsed);
      $("#plank-progress-bar").style.width = `${plankElapsed / 120000 * 100}%`;
      if (plankElapsed >= 120000) finishPlank();
    }, 100);
    return;
  }
  finishPlank();
});

function finishPlank() {
  if (plankStartedAt == null) return;
  plankElapsed = Math.min(120000, Date.now() - plankStartedAt);
  clearInterval(plankTimer);
  plankStartedAt = null;
  scores.plank = plankElapsed;
  saveScores();
  renderScores();
  showToast(`Plank tercatat: ${formatDuration(plankElapsed)}. Pertahankan form yang benar.`);
}

$("#jump-button").addEventListener("click", () => {
  const input = $("#jump-distance");
  const distance = Number(input.value);
  if (!Number.isInteger(distance) || distance < 1 || distance > 1000) {
    $("#jump-hint").textContent = "Masukkan jarak 1–1000 cm sebagai angka bulat.";
    input.focus();
    return;
  }
  scores.jumps.push(distance);
  saveScores();
  renderScores();
  input.value = "";
  $("#jump-hint").textContent = "Hasil dicatat. Pastikan hanya lompatan yang sah.";
  showToast(`Attempt ${scores.jumps.length} long jump tercatat: ${distance} cm.`);
});

const gps = {
  watchId: null,
  startedAt: null,
  elapsedMs: 0,
  timerId: null,
  distance: 0,
  lastPosition: null,
  points: [],
};

function distanceBetween(a, b) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const earthRadius = 6371000;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function drawRoute() {
  if (gps.points.length === 0) return;
  const lats = gps.points.map((point) => point.latitude);
  const lons = gps.points.map((point) => point.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const latSpan = maxLat - minLat || 0.00001;
  const lonSpan = maxLon - minLon || 0.00001;
  const project = (point) => {
    const x = 30 + ((point.longitude - minLon) / lonSpan) * 540;
    const y = 30 + ((maxLat - point.latitude) / latSpan) * 240;
    return { x, y };
  };
  const coords = gps.points.map((point) => project(point));
  if (coords.length > 1) {
    $("#route-line").setAttribute("d", `M ${coords.map(({ x, y }) => `${x},${y}`).join(" L ")}`);
  }
  const { x, y } = coords[coords.length - 1];
  $("#route-person").setAttribute("transform", `translate(${x} ${y})`);
}

function renderGps() {
  const km = gps.distance / 1000;
  $("#distance-value").innerHTML = `${km.toFixed(2)} <small>km</small>`;
  const elapsedMs = gps.elapsedMs + (gps.startedAt == null ? 0 : Date.now() - gps.startedAt);
  $("#gps-time").textContent = formatDuration(elapsedMs);
  const elapsedMinutes = elapsedMs / 60000;
  const pace = km > 0 ? elapsedMinutes / km : null;
  $("#gps-pace").innerHTML = pace == null || !Number.isFinite(pace) ? "— <small>/km</small>" : `${Math.floor(pace)}:${String(Math.floor((pace % 1) * 60)).padStart(2, "0")} <small>/km</small>`;
}

function onGpsPosition(position) {
  const { latitude, longitude, accuracy } = position.coords;
  $("#coordinates").textContent = `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}° · ±${Math.round(accuracy)}M`;
  $("#map-placeholder").hidden = true;
  $("#gps-message").textContent = accuracy > 30 ? "Sinyal GPS kurang akurat. Coba pindah ke area terbuka." : "Posisi diperbarui dari GPS perangkat. Gerak beberapa meter untuk mulai mencatat jarak.";
  if (accuracy <= 40) {
    const current = { latitude, longitude };
    if (gps.lastPosition) {
      const segment = distanceBetween(gps.lastPosition, current);
      if (segment >= 3 && segment <= 100) {
        gps.distance += segment;
        gps.lastPosition = current;
        gps.points.push(current);
        drawRoute();
        $("#gps-message").textContent = "Rute dan jarak sedang direkam di perangkat ini.";
      } else if (segment > 100) {
        gps.lastPosition = current;
        gps.points.push(current);
        drawRoute();
        $("#gps-message").textContent = "Lonjakan GPS diabaikan untuk menjaga akurasi jarak.";
      }
    } else {
      gps.lastPosition = current;
      gps.points.push(current);
    }
  }
  renderGps();
}

function stopGpsWithError(message) {
  if (gps.watchId != null) navigator.geolocation.clearWatch(gps.watchId);
  gps.watchId = null;
  if (gps.startedAt != null) gps.elapsedMs += Date.now() - gps.startedAt;
  gps.startedAt = null;
  clearInterval(gps.timerId);
  gps.timerId = null;
  $("#gps-button").textContent = "⌖ COBA LAGI";
  $("#gps-state").textContent = "● GPS OFF";
  $("#gps-state").classList.remove("active");
  $("#overview-gps").innerHTML = 'SIAP <span class="live-dot"></span>';
  $("#gps-message").textContent = message;
  $("#gps-reset").hidden = false;
}

$("#gps-button").addEventListener("click", () => {
  if (gps.watchId != null) {
    navigator.geolocation.clearWatch(gps.watchId);
    gps.watchId = null;
    if (gps.startedAt != null) gps.elapsedMs += Date.now() - gps.startedAt;
    gps.startedAt = null;
    clearInterval(gps.timerId);
    gps.timerId = null;
    renderGps();
    $("#gps-button").textContent = "LANJUTKAN GPS";
    $("#gps-state").textContent = "● GPS PAUSED";
    $("#gps-state").classList.remove("active");
    $("#overview-gps").innerHTML = 'PAUSED <span class="live-dot"></span>';
    $("#gps-message").textContent = "Tracking dijeda. Jarak yang sudah tercatat tetap tersedia.";
    $("#gps-reset").hidden = false;
    return;
  }
  if (!navigator.geolocation) {
    stopGpsWithError("Browser ini tidak mendukung GPS. Coba gunakan browser modern.");
    showToast("GPS tidak didukung browser ini.");
    return;
  }
  if (!window.isSecureContext) {
    stopGpsWithError("GPS membutuhkan HTTPS atau localhost. Buka web melalui koneksi yang aman.");
    showToast("Izin GPS tersedia hanya di HTTPS atau localhost.");
    return;
  }
  gps.startedAt = Date.now();
  $("#gps-button").textContent = "PAUSE GPS";
  $("#gps-state").textContent = "● GPS ACTIVE";
  $("#gps-state").classList.add("active");
  $("#overview-gps").innerHTML = 'ACTIVE <span class="live-dot"></span>';
  $("#gps-message").textContent = "Meminta lokasi. Izinkan akses lokasi untuk mulai melacak.";
  $("#gps-reset").hidden = false;
  gps.timerId = setInterval(renderGps, 1000);
  gps.watchId = navigator.geolocation.watchPosition(onGpsPosition, (error) => {
    const messages = {
      1: "Izin lokasi ditolak. Aktifkan izin lokasi browser untuk menggunakan GPS.",
      2: "Posisi tidak tersedia. Coba lagi di area dengan sinyal GPS lebih baik.",
      3: "Permintaan lokasi timeout. Coba lagi.",
    };
    stopGpsWithError(messages[error.code] || "GPS gagal mendapatkan lokasi.");
    showToast(messages[error.code] || "GPS gagal mendapatkan lokasi.");
  }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
});

$("#gps-reset").addEventListener("click", () => {
  if (gps.watchId != null) navigator.geolocation.clearWatch(gps.watchId);
  clearInterval(gps.timerId);
  gps.watchId = null;
  gps.timerId = null;
  gps.startedAt = null;
  gps.elapsedMs = 0;
  gps.distance = 0;
  gps.lastPosition = null;
  gps.points = [];
  $("#route-line").setAttribute("d", "");
  $("#route-person").setAttribute("transform", "translate(300 150)");
  $("#map-placeholder").hidden = false;
  $("#coordinates").textContent = "GPS BELUM AKTIF";
  $("#gps-button").textContent = "⌖ AKTIFKAN GPS";
  $("#gps-state").textContent = "● GPS OFF";
  $("#gps-state").classList.remove("active");
  $("#overview-gps").innerHTML = 'SIAP <span class="live-dot"></span>';
  $("#gps-message").textContent = "Aktifkan GPS untuk merekam jarak dan rute perjalananmu.";
  $("#gps-reset").hidden = true;
  renderGps();
});

const now = new Date();
$("#session-date").textContent = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(now).toUpperCase();
renderScores();
renderGps();

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});

const PIN_STORAGE_KEY = "milezero-device-pin-v1";
const lockScreen = $("#lock-screen");
const appShell = $(".app-shell");
const unlockForm = $("#unlock-form");
const setupForm = $("#setup-form");
const changePinForm = $("#change-pin-form");
const lockMessage = $("#lock-message");
const PIN_ITERATIONS = 180000;
let unlocked = false;
let pinScreenMode = "unlock";

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPin(pin, salt) {
  if (!window.crypto?.subtle) {
    throw new Error("PIN aman membutuhkan HTTPS atau browser yang mendukung Web Crypto.");
  }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const result = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt,
    iterations: PIN_ITERATIONS,
    hash: "SHA-256",
  }, key, 256);
  return bytesToHex(new Uint8Array(result));
}

function showLockScreen(message = "") {
  unlocked = false;
  pinScreenMode = "unlock";
  appShell.hidden = true;
  lockScreen.hidden = false;
  lockMessage.textContent = message;
  const pinExists = localStorage.getItem(PIN_STORAGE_KEY) !== null;
  unlockForm.hidden = !pinExists;
  setupForm.hidden = pinExists;
  changePinForm.hidden = true;
  $("#forgot-pin-button").hidden = !pinExists;
  $("#cancel-pin-change").hidden = true;
  $("#lock-title").innerHTML = pinExists ? 'WELCOME<br /><span>BACK.</span>' : 'SET YOUR<br /><span>PIN.</span>';
  $("#lock-description").textContent = pinExists
    ? "Masukkan PIN untuk membuka sesi Milezero di perangkat ini."
    : "Buat PIN pribadi untuk mengunci sesi Milezero di perangkat ini.";
  resetPasswordVisibility();
  requestAnimationFrame(() => (pinExists ? $("#unlock-pin") : $("#new-pin")).focus());
}

function openSession() {
  unlocked = true;
  lockScreen.hidden = true;
  appShell.hidden = false;
  unlockForm.reset();
  setupForm.reset();
  changePinForm.reset();
  resetPasswordVisibility();
  lockMessage.textContent = "";
}

function showChangePinScreen() {
  pinScreenMode = "change";
  appShell.hidden = true;
  lockScreen.hidden = false;
  unlockForm.hidden = true;
  setupForm.hidden = true;
  changePinForm.hidden = false;
  $("#forgot-pin-button").hidden = true;
  $("#cancel-pin-change").hidden = false;
  $("#lock-title").innerHTML = 'CHANGE<br /><span>YOUR PIN.</span>';
  $("#lock-description").textContent = "Verifikasi PIN sekarang, lalu buat PIN baru untuk perangkat ini.";
  lockMessage.textContent = "";
  changePinForm.reset();
  resetPasswordVisibility();
  requestAnimationFrame(() => $("#current-pin").focus());
}

function stopActiveSession() {
  if (sprintStartedAt != null) {
    const elapsed = (performance.now() - sprintStartedAt) / 1000;
    clearInterval(sprintTimer);
    sprintStartedAt = null;
    scores.sprint.push(elapsed);
    saveScores();
    renderScores();
  }
  if (plankStartedAt != null) finishPlank();
  if (gps.watchId != null) {
    navigator.geolocation.clearWatch(gps.watchId);
    gps.watchId = null;
    if (gps.startedAt != null) gps.elapsedMs += Date.now() - gps.startedAt;
    gps.startedAt = null;
    clearInterval(gps.timerId);
    gps.timerId = null;
    renderGps();
    $("#gps-button").textContent = "LANJUTKAN GPS";
    $("#gps-state").textContent = "● GPS PAUSED";
    $("#gps-state").classList.remove("active");
    $("#overview-gps").innerHTML = 'PAUSED <span class="live-dot"></span>';
    $("#gps-message").textContent = "Tracking dijeda saat sesi dikunci.";
    $("#gps-reset").hidden = false;
  }
}

$("#lock-button").addEventListener("click", () => {
  stopActiveSession();
  showLockScreen("Sesi dikunci. Masukkan PIN untuk melanjutkan.");
});

$("#change-pin-button").addEventListener("click", () => {
  stopActiveSession();
  showChangePinScreen();
});

$("#cancel-pin-change").addEventListener("click", () => {
  if (pinScreenMode === "change" && unlocked) openSession();
});

$("#forgot-pin-button").addEventListener("click", () => {
  const confirmed = window.confirm(
    "Lupa PIN? Reset akan menghapus kunci PIN lokal dan membuat PIN baru. Skor challenge tetap tersimpan. Siapa pun yang punya akses ke perangkat ini bisa melakukan reset. Lanjutkan?"
  );
  if (!confirmed) return;
  try {
    localStorage.removeItem(PIN_STORAGE_KEY);
    showLockScreen("Kunci PIN direset. Buat PIN baru untuk masuk.");
  } catch (error) {
    console.error("Gagal mereset PIN Milezero.", error);
    lockMessage.textContent = "PIN tidak dapat direset di browser ini.";
  }
});

document.querySelectorAll("[data-password-toggle]").forEach((button) => {
  button.innerHTML = eyeIcon(false);
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    button.setAttribute("aria-pressed", String(reveal));
    button.setAttribute("aria-label", reveal ? "Sembunyikan PIN" : "Tampilkan PIN");
    button.innerHTML = eyeIcon(reveal);
    input.focus();
  });
});

function eyeIcon(revealed) {
  return revealed
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.7 4.3 10 7-.5 1-1.3 2-2.3 2.9M6.2 6.2C3.9 7.7 2.5 10 2 12c1.3 2.7 5 7 10 7 1.2 0 2.3-.2 3.3-.7"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
}

function resetPasswordVisibility() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    const input = document.getElementById(button.dataset.passwordToggle);
    input.type = "password";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", "Tampilkan PIN");
    button.innerHTML = eyeIcon(false);
  });
}

async function verifyPin(pin, credential) {
  if (!credential || !/^(?:[0-9a-f]{2}){16}$/i.test(credential.salt) || !/^[0-9a-f]{64}$/i.test(credential.hash)) {
    throw new Error("Data PIN tidak valid. Reset PIN untuk membuat PIN baru.");
  }
  const salt = Uint8Array.from(credential.salt.match(/.{2}/g), (byte) => parseInt(byte, 16));
  return (await hashPin(pin, salt)) === credential.hash;
}

setupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const pin = $("#new-pin").value;
  const confirmation = $("#confirm-pin").value;
  if (!/^\d{6,12}$/.test(pin)) {
    lockMessage.textContent = "PIN harus terdiri dari 6–12 angka.";
    return;
  }
  if (pin !== confirmation) {
    lockMessage.textContent = "Konfirmasi PIN tidak cocok.";
    $("#confirm-pin").focus();
    return;
  }
  const submit = setupForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const credential = {
      salt: bytesToHex(salt),
      hash: await hashPin(pin, salt),
      iterations: PIN_ITERATIONS,
    };
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(credential));
    openSession();
  } catch (error) {
    console.error("Gagal menyiapkan PIN Milezero.", error);
    lockMessage.textContent = error instanceof DOMException && error.name === "QuotaExceededError"
      ? "Penyimpanan browser penuh. Kosongkan ruang lalu coba lagi."
      : error.message || "PIN tidak bisa disimpan di browser ini.";
  } finally {
    submit.disabled = false;
  }
});

unlockForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const pin = $("#unlock-pin").value;
  if (!/^\d{6,12}$/.test(pin)) {
    lockMessage.textContent = "Masukkan PIN 6–12 angka.";
    return;
  }
  const submit = unlockForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const credential = JSON.parse(localStorage.getItem(PIN_STORAGE_KEY));
    if (!await verifyPin(pin, credential)) {
      lockMessage.textContent = "PIN salah. Coba lagi.";
      $("#unlock-pin").select();
      return;
    }
    openSession();
  } catch (error) {
    console.error("Gagal membuka sesi Milezero.", error);
    lockMessage.textContent = error.message || "Tidak bisa memverifikasi PIN.";
  } finally {
    submit.disabled = false;
  }
});

changePinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const currentPin = $("#current-pin").value;
  const newPin = $("#replacement-pin").value;
  const confirmation = $("#confirm-replacement-pin").value;
  if (!/^\d{6,12}$/.test(currentPin) || !/^\d{6,12}$/.test(newPin)) {
    lockMessage.textContent = "PIN harus terdiri dari 6–12 angka.";
    return;
  }
  if (newPin !== confirmation) {
    lockMessage.textContent = "Konfirmasi PIN baru tidak cocok.";
    $("#confirm-replacement-pin").focus();
    return;
  }
  if (newPin === currentPin) {
    lockMessage.textContent = "PIN baru harus berbeda dari PIN sekarang.";
    $("#replacement-pin").focus();
    return;
  }
  const submit = changePinForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const credential = JSON.parse(localStorage.getItem(PIN_STORAGE_KEY));
    if (!await verifyPin(currentPin, credential)) {
      lockMessage.textContent = "PIN sekarang salah. Coba lagi.";
      $("#current-pin").select();
      return;
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify({
      salt: bytesToHex(salt),
      hash: await hashPin(newPin, salt),
      iterations: PIN_ITERATIONS,
    }));
    openSession();
    showToast("PIN berhasil diganti.");
  } catch (error) {
    console.error("Gagal mengganti PIN Milezero.", error);
    lockMessage.textContent = error.message || "PIN tidak dapat diganti di browser ini.";
  } finally {
    submit.disabled = false;
  }
});

showLockScreen();
