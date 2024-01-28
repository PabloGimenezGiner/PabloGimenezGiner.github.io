// Parámetros ajustables
const warpZ = 32; // Factor de distorsión para el efecto de velocidad de la estrella
const units = 1024; // Número de estrellas en el campo
let valorExponencial = 0.6; // Valor exponencial utilizado en el efecto de velocidad
let Z = valorExponencial; // Valor actualizado para el efecto de velocidad
const lineWidthFactor = 2; // Factor para el ancho de línea de las estrellas
let cx = window.innerWidth / 2; // Coordenada x del centro
let cy = window.innerHeight / 2; // Coordenada y del centro
let isMouseDown = false; // Bandera para rastrear el estado del botón del ratón
let angle = 0; // Ángulo para la dirección de visualización

// Inicio de la aceleración
let contador = 0; // Contador utilizado en el ajuste de la velocidad
const vei = 2; // Valor inicial de velocidad
const vef = 0.04; // Valor final de velocidad
const cf = 60; // Número de fotogramas para la transición
const tt = 2 * 1000; // Tiempo total de la transición en milisegundos

// Configurar una transición suave para el valor exponencial
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

// Obtener el elemento canvas y su contexto 2D
var canvas = document.getElementById('starField');
var ctx = canvas.getContext('2d');

// Función para actualizar las dimensiones del canvas en función del tamaño de la ventana
function updateCanvasDimensions() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Agregar un evento de redimensionamiento para actualizar las dimensiones del canvas
window.addEventListener('resize', updateCanvasDimensions);
updateCanvasDimensions();

// Inicializar un array de estrellas con posiciones y propiedades iniciales
var stars = [];
var cycle = 0;

function resetStar(a) {
    // Restablecer las propiedades de una estrella
    a.x = (Math.random() * canvas.width - (canvas.width * 0.5)) * warpZ;
    a.y = (Math.random() * canvas.height - (canvas.height * 0.5)) * warpZ;
    a.z = warpZ;
    a.px = 0;
    a.py = 0;
}

// Crear estrellas y agregarlas al array
for (var i = 0, n; i < units; i++) {
    n = {};
    resetStar(n);
    stars.push(n);
}

// Función para dibujar el campo estelar
function drawStars() {
    // Configurar el fondo y la transparencia
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calcular la saturación del color en función del valor exponencial
    var sat = Math.floor(Z * 500);
    sat = (sat > 100) ? 100 : sat;

    // Iterar sobre las estrellas y dibujar líneas conectándolas
    for (var i = 0; i < units; i++) {
        var n = stars[i],
            xx = n.x / n.z,
            yy = n.y / n.z,
            e = (1.0 / n.z + 1) * lineWidthFactor;

        if (n.px) {
            // Configurar el estilo de línea y dibujar una línea desde la posición anterior
            ctx.strokeStyle = "hsl(" + ((cycle * i) % 1) + ",0%,60%)";
            ctx.lineWidth = e;
            ctx.beginPath();
            ctx.moveTo(xx + cx, yy + cy);
            ctx.lineTo(n.px + cx, n.py + cy);
            ctx.stroke();
        }

        // Actualizar la posición de la estrella y restablecer si está fuera de la pantalla
        n.px = xx;
        n.py = yy;
        n.z -= Z;

        if (n.z < Z || n.px > canvas.width || n.py > canvas.height) {
            resetStar(n);
        }
    }

    // Incrementar el ciclo para cambiar el color con el tiempo
    cycle += 0.03;
    requestAnimationFrame(drawStars);
}

// Iniciar la animación del campo estelar
drawStars();

// Manejar eventos del ratón
window.addEventListener('mousedown', function (event) {
    isMouseDown = true;
});

window.addEventListener('mouseup', function () {
    isMouseDown = false;
});

window.addEventListener('mousemove', function (event) {
    if (isMouseDown) {
        // Obtener la dirección del ratón en relación con el centro
        const dx = event.clientX - window.innerWidth / 2;
        const dy = event.clientY - window.innerHeight / 2;

        // Calcular el ángulo de la dirección del ratón
        angle = Math.atan2(dy, dx);
    }
});

// Función para actualizar la posición del centro en cada fotograma
function updateCenterPosition() {
    if (isMouseDown) {
        // Ajustar la velocidad en función de la distancia (más cerca, más rápido; más lejos, más lento)
        const maxDistance = Math.sqrt((window.innerWidth / 2) ** 2 + (window.innerHeight / 2) ** 2);
        const normalizedDistance = Math.min(Math.sqrt((cx - window.innerWidth / 2) ** 2 + (cy - window.innerHeight / 2) ** 2) / maxDistance, 1);
        const maxSpeed = 20;
        const speed = maxSpeed * (1 - normalizedDistance); // Ahora es más rápido cerca del centro

        // Actualizar la posición del centro basándose en la dirección y el ángulo
        cx += Math.cos(angle) * speed;
        cy += Math.sin(angle) * speed;

        // Mantener el centro dentro de la ventana
        cx = Math.max(Math.min(cx, window.innerWidth), 0);
        cy = Math.max(Math.min(cy, window.innerHeight), 0);
    }
}

// ... (Previous code remains unchanged)

window.addEventListener('mousedown', handleMouseDown);
window.addEventListener('mouseup', handleMouseUp);
window.addEventListener('mousemove', handleMouseMove);

// Add touch events
window.addEventListener('touchstart', handleTouchStart);
window.addEventListener('touchend', handleTouchEnd);
window.addEventListener('touchmove', handleTouchMove);

// Combine mouse and touch event handling logic
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

// ... (Remaining code remains unchanged)


// Llamada a la función para actualizar la posición del centro en cada fotograma
setInterval(updateCenterPosition, 1000 / 60); // Ajusta la frecuencia según sea necesario
