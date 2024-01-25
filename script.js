// Adjustable Parameters
var warpZ = 32;         // Controls the warping effect on star positions (velocidad (32))
var units = 2000;       // Number of stars in the star field (cantidad (2000))
var Z = 0.01 + (1 / 200 * 10);  // Controls the speed of stars moving towards the viewer
var lineWidthFactor = 2; // Controls the factor by which the line width is multiplied

var canvas = document.getElementById('starField');
var ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var stars = [];
var cycle = 0;

function resetstar(a) {
    a.x = (Math.random() * canvas.width - (canvas.width * 0.5)) * warpZ;
    a.y = (Math.random() * canvas.height - (canvas.height * 0.5)) * warpZ;
    a.z = warpZ;
    a.px = 0;
    a.py = 0;
}

for (var i = 0, n; i < units; i++) {
    n = {};
    resetstar(n);
    stars.push(n);
}

function drawStars() {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var cx = canvas.width / 2,
        cy = canvas.height / 2;

    var sat = Math.floor(Z * 500);
    sat = (sat > 100) ? 100 : sat;

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
            resetstar(n);
        }
    }
    cycle += 0.03;
    requestAnimationFrame(drawStars);
}

drawStars();