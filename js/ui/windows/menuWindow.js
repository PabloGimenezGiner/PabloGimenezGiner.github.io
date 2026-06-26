// ui/windows/menuWindow.js

export function renderMenu() {
  return `
    <button data-action="resume">▶ Volver al juego</button>
    <button data-action="togglePause">⏸️ Pausa: Activada</button>
    <hr style="border-color: rgba(255,255,255,0.1); margin: 10px 0;">
    <button data-action="progress">📊 Progreso</button>
    <button data-action="stats">📈 Estadísticas</button>
    <button data-action="options">⚙️ Opciones</button>
    <button data-action="reset">🏠 Volver al inicio</button>
  `;
}

export function setupMenuEvents(container, actions) {
  container.querySelectorAll('[data-action]').forEach(btn => {
    const action = btn.dataset.action;
    if (actions[action]) {
      btn.addEventListener('click', actions[action]);
    }
  });
}