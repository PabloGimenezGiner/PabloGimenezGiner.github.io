// Adjustable Parameters
const warpZ = 32; // Controls the warping effect on star positions
const units = 1024; // Number of stars in the star field
let valorExponencial = 0.6; // Initialize valorExponencial
let Z = valorExponencial; // Controls the speed of stars moving towards the viewer
const lineWidthFactor = 2; // Controls the factor by which the line width is multiplied

// Start acceleration
let contador = 0;
const vei = 2; // valorExponencialInicial (Solo x > 0)
const vef = 0.04; // valorExponencialFinal
const cf = 60; // contadorFinal
const tt = 2 * 1000; // tiempoTotal (segundos * milisegundos)

const intervalId = setInterval(() => {
    if (contador >= cf) {
        // Detener el intervalo cuando se alcanza el contador final
        clearInterval(intervalId);
    } else {
        // Ajuste para evitar dividir por 0
        const porcentajeContador = contador / (cf - 1);
        
        // Calcular el valor exponencial en función del contador
        valorExponencial = vei * Math.pow(vef / vei, porcentajeContador);
        
        // Update Z after recalculating valorExponencial
        Z = valorExponencial;

        contador++;
    }
}, tt / cf); // Incrementa el contador en función del tiempo total y el contador final

var canvas = document.getElementById('starField'); // Reference to the canvas element
var ctx = canvas.getContext('2d'); // Context for drawing on the canvas

canvas.width = window.innerWidth; // Set canvas width to window width
canvas.height = window.innerHeight; // Set canvas height to window height

var stars = []; // Array to store star objects
var cycle = 0; // Variable to control color variation over time

// Function to reset the properties of a star
function resetStar(a) {
    a.x = (Math.random() * canvas.width - (canvas.width * 0.5)) * warpZ;
    a.y = (Math.random() * canvas.height - (canvas.height * 0.5)) * warpZ;
    a.z = warpZ;
    a.px = 0;
    a.py = 0;
}

// Initialize stars array with randomly positioned stars
for (var i = 0, n; i < units; i++) {
    n = {};
    resetStar(n);
    stars.push(n);
}


// Function to draw stars on the canvas
function drawStars() {
    ctx.globalAlpha = 0.8; // Set the global alpha (transparency) value
    ctx.fillStyle = "#000"; // Set the fill color to black
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill the entire canvas with black

    var cx = canvas.width / 2; // Calculate the center x-coordinate of the canvas
    var cy = canvas.height / 2; // Calculate the center y-coordinate of the canvas

    var sat = Math.floor(Z * 500);
    sat = (sat > 100) ? 100 : sat;

    // Loop through each star in the stars array
    for (var i = 0; i < units; i++) {
        var n = stars[i],
            xx = n.x / n.z,// Calculate x-coordinate adjusted for star's depth
            yy = n.y / n.z,// Calculate y-coordinate adjusted for star's depth
            e = (1.0 / n.z + 1) * lineWidthFactor;// Calculate effective line width

        if (n.px) {
            // Draw lines between the current and previous positions of the star
            ctx.strokeStyle = "hsl(" + ((cycle * i) % 1) + ",0%,60%)";// Set line color based on cycle and index
            ctx.lineWidth = e;// Set line width
            ctx.beginPath();
            ctx.moveTo(xx + cx, yy + cy);
            ctx.lineTo(n.px + cx, n.py + cy);
            ctx.stroke();
        }

        n.px = xx; // Update previous x-coordinate for the next frame
        n.py = yy; // Update previous y-coordinate for the next frame
        n.z -= Z; // Move star towards the viewer

        if (n.z < Z || n.px > canvas.width || n.py > canvas.height) {
            // Reset star position if it goes beyond the canvas or reaches the viewer
            resetStar(n);
        }
    }

    cycle += 0.03; // Increment the cycle variable for color variation
    requestAnimationFrame(drawStars); // Request the next animation frame
}

drawStars(); // Start the initial drawing of stars
