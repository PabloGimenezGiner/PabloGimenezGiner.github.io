// ui/windows/statsWindow.js
import pathManager from '../../render/path/pathManager.js';

export function renderStats() {
  const stats = pathManager.getStats();
  const distance = stats.totalDistance;
  const points = stats.points;
  const maxPoints = stats.maxPoints;
  const persistent = stats.persistent ? 'Sí' : 'No';
  
  // Formatear distancia
  let distStr;
  if (distance > 1000000) {
    distStr = (distance / 1000000).toFixed(2) + ' M';
  } else if (distance > 1000) {
    distStr = (distance / 1000).toFixed(2) + ' k';
  } else {
    distStr = distance.toFixed(1);
  }
  
  // Distancia media entre puntos
  let avgDist = '—';
  if (points > 1) {
    avgDist = (distance / (points - 1)).toFixed(1);
  }
  
  return `
    <h3 style="margin-top:0; margin-bottom:12px;">📈 Estadísticas de vuelo</h3>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px 16px; font-size:14px;">
      <span style="color:#aaa;">Distancia total</span>
      <span style="color:#4f4; font-weight:bold;">${distStr}</span>
      
      <span style="color:#aaa;">Puntos registrados</span>
      <span style="color:#4f4;">${points}</span>
      
      <span style="color:#aaa;">Límite de puntos</span>
      <span style="color:#4f4;">${maxPoints}</span>
      
      <span style="color:#aaa;">Distancia media</span>
      <span style="color:#4f4;">${avgDist}</span>
      
      <span style="color:#aaa;">Modo persistente</span>
      <span style="color:#4f4;">${persistent}</span>
    </div>
    <hr style="border-color: rgba(255,255,255,0.08); margin: 16px 0;">
    <p style="font-size:12px; color:#888; text-align:center;">
      La distancia se calcula sumando la distancia entre puntos registrados.<br>
      ${points === 0 ? 'Aún no has recorrido ninguna distancia.' : ''}
    </p>
  `;
}