// render/pathRenderer.js
import { project3D } from '../camera/cameraPhysics.js';
import { pathPoints, pathVisible, pathPersistent, pathSimplifyTolerance } from '../core/gameState.js';

// ===== Algoritmo Douglas-Peucker simplificado para 3D =====
function douglasPeucker(points, tolerance) {
    if (points.length <= 2) return points;
    const first = points[0];
    const last = points[points.length - 1];
    let maxDist = 0, maxIndex = 0;
    for (let i = 1; i < points.length - 1; i++) {
        const dist = perpendicularDistance(points[i], first, last);
        if (dist > maxDist) {
            maxDist = dist;
            maxIndex = i;
        }
    }
    if (maxDist > tolerance) {
        const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
        const right = douglasPeucker(points.slice(maxIndex), tolerance);
        return left.slice(0, -1).concat(right);
    } else {
        return [first, last];
    }
}

function perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const dz = lineEnd.z - lineStart.z;
    const lenSq = dx*dx + dy*dy + dz*dz;
    if (lenSq === 0) return 0;
    const t = ((point.x - lineStart.x)*dx + (point.y - lineStart.y)*dy + (point.z - lineStart.z)*dz) / lenSq;
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    const projZ = lineStart.z + t * dz;
    return Math.hypot(point.x - projX, point.y - projY, point.z - projZ);
}

export function renderPath(ctx, camera) {
    if (!pathVisible || pathPoints.length < 2) return;

    // Obtener puntos simplificados (solo para renderizado)
    let renderPoints = pathPoints;
    // Si NO es persistente y hay tolerancia > 0, simplificar
    if (!pathPersistent && pathSimplifyTolerance > 0 && pathPoints.length > 10) {
        renderPoints = douglasPeucker(pathPoints, pathSimplifyTolerance);
    }

    if (renderPoints.length < 2) return;

    const total = renderPoints.length;
    const constantAlpha = 0.8;
    const SUBDIV_DIST = 50;
    const MAX_SUBDIV = 20;

    // Configurar trazo según persistencia
    const lineWidth = pathPersistent ? 3.5 : 2.5;
    const baseColor = pathPersistent ? '0, 255, 255' : '0, 200, 255';

    for (let i = 1; i < total; i++) {
        const pA = renderPoints[i - 1];
        const pB = renderPoints[i];

        const projA = project3D(pA.x, pA.y, pA.z);
        const projB = project3D(pB.x, pB.y, pB.z);

        if (!projA.visible && !projB.visible) continue;

        let alphaA, alphaB;
        if (pathPersistent) {
            alphaA = alphaB = constantAlpha;
        } else {
            const tA = (i - 1) / total;
            const tB = i / total;
            alphaA = 0.2 + 0.8 * tA;
            alphaB = 0.2 + 0.8 * tB;
        }

        const dist = Math.hypot(pB.x - pA.x, pB.y - pA.y, pB.z - pA.z);
        let subdivs = Math.max(1, Math.ceil(dist / SUBDIV_DIST));
        subdivs = Math.min(MAX_SUBDIV, subdivs);

        let prevProj = projA;
        let prevAlpha = alphaA;

        for (let s = 1; s <= subdivs; s++) {
            const t = s / subdivs;
            const x = pA.x + (pB.x - pA.x) * t;
            const y = pA.y + (pB.y - pA.y) * t;
            const z = pA.z + (pB.z - pA.z) * t;
            const proj = project3D(x, y, z);
            const alpha = alphaA + (alphaB - alphaA) * t;

            if (prevProj.visible && proj.visible) {
                ctx.beginPath();
                ctx.moveTo(prevProj.x, prevProj.y);
                ctx.lineTo(proj.x, proj.y);
                ctx.strokeStyle = `rgba(${baseColor}, ${alpha})`;
                ctx.lineWidth = lineWidth;
                ctx.stroke();
            }

            prevProj = proj;
            prevAlpha = alpha;
        }
    }

    // ── Calcular alphas para los extremos ──
    const totalRender = renderPoints.length;
    let alphaFirst, alphaLast;
    if (pathPersistent) {
        alphaFirst = 0.8;
        alphaLast = 0.8;
    } else {
        if (totalRender > 1) {
            alphaFirst = 0.2;
            alphaLast  = 1.0;
        } else {
            alphaFirst = alphaLast = 0.5;
        }
    }

    // ── Círculo en el PRIMER punto ──
    const firstProj = project3D(renderPoints[0].x, renderPoints[0].y, renderPoints[0].z);
    if (firstProj.visible) {
        ctx.beginPath();
        ctx.arc(firstProj.x, firstProj.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 200, 255, ${alphaFirst})`;
        ctx.fill();
    }

    // ── Círculo en el ÚLTIMO punto ──
    const lastProj = project3D(renderPoints[renderPoints.length - 1].x, renderPoints[renderPoints.length - 1].y, renderPoints[renderPoints.length - 1].z);
    if (lastProj.visible) {
        ctx.beginPath();
        ctx.arc(lastProj.x, lastProj.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 200, 50, ${alphaLast})`;
        ctx.fill();
    }
}