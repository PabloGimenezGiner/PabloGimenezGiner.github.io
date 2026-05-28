// === 1. Setup del Canvas ===
export const canvas = document.getElementById("spaceCanvas");
export const ctx = canvas.getContext("2d");
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();
