// Parámetros ajustables
const warpZ = 32;
const units = 1024;
let valorExponencial = 0.6;
let Z = valorExponencial;
const lineWidthFactor = 2;
let cx = window.innerWidth / 2;
let cy = window.innerHeight / 2;
let isMouseDown = false;
let angle = 0;

// Inicio de la aceleración
let contador = 0;
const vei = 2;
const vef = 0.04;
const cf = 60;
const tt = 2 * 1000;

const intervalId = setInterval(() => {
    if (contador >= cf) {
        clearInterval(intervalId);
    } else {
        const porcentajeContador = contador / (cf - 1);
        valorExponencial = vei * Math.pow(vef / vei, porcentajeContador);
        Z = valorExponencial;
        contador++;
    }
}, tt / cf);

var canvas = document.getElementById('starField');
var ctx = canvas.getContext('2d');

function updateCanvasDimensions() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', updateCanvasDimensions);
updateCanvasDimensions();

var stars = [];
var cycle = 0;

function resetStar(a) {
    a.x = (Math.random() * canvas.width - (canvas.width * 0.5)) * warpZ;
    a.y = (Math.random() * canvas.height - (canvas.height * 0.5)) * warpZ;
    a.z = warpZ;
    a.px = 0;
    a.py = 0;
}

for (var i = 0, n; i < units; i++) {
    n = {};
    resetStar(n);
    stars.push(n);
}

function drawStars() {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < units; i++) {
        var n = stars[i],
            xx = n.x / n.z,
            yy = n.y / n.z,
            e = (1.0 / n.z + 1) * lineWidthFactor;

        if (n.px) {
            ctx.strokeStyle = "hsl(" + ((cycle * i) % 1) + ",0%,60%)";
            ctx.lineWidth = e;
            ctx.beginPath();
            ctx.moveTo(xx + cx, yy + cy);
            ctx.lineTo(n.px + cx, n.py + cy);
            ctx.stroke();
        }

        n.px = xx;
        n.py = yy;
        n.z -= Z;

        if (n.z < Z || n.px > canvas.width || n.py > canvas.height) {
            resetStar(n);
        }
    }

    cycle += 0.03;
    requestAnimationFrame(drawStars);
}

drawStars();

function updateCenterPosition() {
    if (isMouseDown) {
        const maxDistance = Math.sqrt((window.innerWidth / 2) ** 2 + (window.innerHeight / 2) ** 2);
        const normalizedDistance = Math.min(Math.sqrt((cx - window.innerWidth / 2) ** 2 + (cy - window.innerHeight / 2) ** 2) / maxDistance, 1);
        const maxSpeed = 20;
        const speed = maxSpeed * (1 - normalizedDistance);

        cx -= Math.cos(angle) * speed;
        cy -= Math.sin(angle) * speed;

        cx = Math.max(Math.min(cx, window.innerWidth), 0);
        cy = Math.max(Math.min(cy, window.innerHeight), 0);
    }
}

window.addEventListener('mousedown', handleMouseDown);
window.addEventListener('mouseup', handleMouseUp);
window.addEventListener('mousemove', handleMouseMove);

window.addEventListener('touchstart', handleTouchStart);
window.addEventListener('touchend', handleTouchEnd);
window.addEventListener('touchmove', handleTouchMove);

window.addEventListener('mousedown', function (event) {
    isMouseDown = true;
});

window.addEventListener('mouseup', function () {
    isMouseDown = false;
});

window.addEventListener('mousemove', function (event) {
    if (isMouseDown) {
        const dx = event.clientX - window.innerWidth / 2;
        const dy = event.clientY - window.innerHeight / 2;
        angle = Math.atan2(dy, dx);
    }
});

function handleMouseDown(event) {
    isMouseDown = true;
    handleInteraction(event.clientX, event.clientY);
}

function handleMouseUp() {
    isMouseDown = false;
}

function handleMouseMove(event) {
    if (isMouseDown) {
        handleInteraction(event.clientX, event.clientY);
    }
}

function handleTouchStart(event) {
    isMouseDown = true;
    const touch = event.touches[0];
    handleInteraction(touch.clientX, touch.clientY);
}

function handleTouchEnd() {
    isMouseDown = false;
}

function handleTouchMove(event) {
    if (isMouseDown) {
        const touch = event.touches[0];
        handleInteraction(touch.clientX, touch.clientY);
    }
}

function handleInteraction(clientX, clientY) {
    const dx = clientX - window.innerWidth / 2;
    const dy = clientY - window.innerHeight / 2;
    angle = Math.atan2(dy, dx);
}

setInterval(updateCenterPosition, 1000 / 60);