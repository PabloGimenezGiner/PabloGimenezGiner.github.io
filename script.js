const targetCX = window.innerWidth / 2;
const targetCY = window.innerHeight / 2;

const warpZ = 32;
const units = 1024;
let valorExponencial = 0.6;
let Z = valorExponencial;
const lineWidthFactor = 2;
let cx = window.innerWidth / 2;
let cy = window.innerHeight / 2;
let isMouseDown = false;
let angle = 0;
let iconoDeFuga = "·";

let contador = 0;
const vei = 2;
const vef = 0.04;
const cf = 60;
const tt = 2 * 1000;

let inactivityTimer;
const inactivityDuration = 1000;
const animationDuration = 2000;

var canvas = document.getElementById('starField');
var ctx = canvas.getContext('2d');

window.addEventListener('resize', updateCanvasDimensions);
updateCanvasDimensions();

var stars = [];
var cycle = 0;

setInterval(updateCenterPosition, 1000 / 60);

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

function updateCanvasDimensions() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

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

function drawText() {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px verdana, arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(iconoDeFuga, cx, cy);
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
    drawText();
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

function startInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        resetCenterPosition();
    }, inactivityDuration);
}

function resetCenterPosition() {
    animateCenterPosition(cx, cy, targetCX, targetCY, animationDuration);
}

function animateCenterPosition(startX, startY, targetX, targetY, duration) {
    let startTime;
    
    function animate(currentTime) {
        if (!startTime) {
            startTime = currentTime;
        }

        const progress = (currentTime - startTime) / duration;

        if (progress < 1) {
            cx = easeInOutQuad(progress, startX, targetX - startX, 1);
            cy = easeInOutQuad(progress, startY, targetY - startY, 1);
            requestAnimationFrame(animate);
        } else {
            cx = targetX;
            cy = targetY;
        }
    }

    requestAnimationFrame(animate);
}

function easeInOutQuad(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
}

window.addEventListener('mousedown', handleMouseDown);
window.addEventListener('mouseup', handleMouseUp);
window.addEventListener('mousemove', handleMouseMove);

window.addEventListener('touchstart', handleTouchStart);
window.addEventListener('touchend', handleTouchEnd);
window.addEventListener('touchmove', handleTouchMove);

window.addEventListener('mousedown', function (event) {
    isMouseDown = true;
    handleInteraction(event.clientX, event.clientY);
    startInactivityTimer();
});

window.addEventListener('mouseup', function () {
    isMouseDown = false;
    startInactivityTimer();
});

window.addEventListener('mousemove', function (event) {
    if (isMouseDown) {
        handleInteraction(event.clientX, event.clientY);
        startInactivityTimer();
    }
});

function handleMouseDown(event) {
    isMouseDown = true;
    handleInteraction(event.clientX, event.clientY);
    startInactivityTimer();
}

function handleMouseUp() {
    isMouseDown = false;
    startInactivityTimer();
}

function handleMouseMove(event) {
    if (isMouseDown) {
        handleInteraction(event.clientX, event.clientY);
        startInactivityTimer();
    }
}

function handleTouchStart(event) {
    isMouseDown = true;
    const touch = event.touches[0];
    handleInteraction(touch.clientX, touch.clientY);
    startInactivityTimer();
}

function handleTouchEnd() {
    isMouseDown = false;
    startInactivityTimer();
}

function handleTouchMove(event) {
    if (isMouseDown) {
        const touch = event.touches[0];
        handleInteraction(touch.clientX, touch.clientY);
        startInactivityTimer();
    }
}

function handleInteraction(clientX, clientY) {
    const dx = clientX - window.innerWidth / 2;
    const dy = clientY - window.innerHeight / 2;
    angle = Math.atan2(dy, dx);
}