// === 1. Setup del Canvas ===
export const canvas = document.getElementById("spaceCanvas");
export const ctx = canvas.getContext("2d");
function resize() {
  ctx.canvas.width = window.innerWidth;
  ctx.canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();
