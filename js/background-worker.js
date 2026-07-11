// js/background-worker.js
let prevTimestamp = performance.now();
let isRunning = true;
let accumulator = 0;
let intervalId = null;

function tick() {
  if (!isRunning) return;

  const now = performance.now();
  const dt = Math.min(0.1, (now - prevTimestamp) / 1000);
  prevTimestamp = now;
  accumulator += dt;

  // Enviamos el dt acumulado cuando supera los 100 ms
  if (accumulator >= 0.1) {
    self.postMessage(accumulator);
    accumulator = 0;
  }
}

// Escuchar mensajes del hilo principal
self.addEventListener('message', (e) => {
  if (e.data === 'start') {
    isRunning = true;
    prevTimestamp = performance.now();
    accumulator = 0;
    if (intervalId) clearInterval(intervalId);
    // Usamos setInterval en lugar de setTimeout recursivo
    intervalId = setInterval(tick, 100); // cada 100 ms
  } else if (e.data === 'stop') {
    isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
});

// Arrancar automáticamente al cargar el Worker (opcional)
// No se llama a tick() directamente, se espera mensaje 'start' desde main.js
// Pero si se quiere autostart, se puede descomentar:
// if (isRunning) intervalId = setInterval(tick, 100);