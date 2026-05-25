import { useEffect, useRef } from 'react';

const COLORS = ['#f59e0b', '#fde68a', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#fff'];

function random(min, max) {
  return Math.random() * (max - min) + min;
}

export default function Confetti({ active, intensity = 'normal' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    const count = intensity === 'heavy' ? 180 : 90;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: random(0, canvas.width),
        y: random(-canvas.height, 0),
        w: random(6, 12),
        h: random(4, 9),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: random(0, 360),
        rotationSpeed: random(-6, 6),
        vx: random(-2, 2),
        vy: random(2, 6),
        opacity: 1,
      });
    }

    let frame = 0;
    const maxFrames = intensity === 'heavy' ? 280 : 180;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rotation += p.rotationSpeed;
        if (frame > maxFrames * 0.6) p.opacity -= 0.015;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      frame++;
      if (frame < maxFrames) {
        animationId = requestAnimationFrame(draw);
      }
    }

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [active, intensity]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="confetti-canvas"
      aria-hidden="true"
    />
  );
}
