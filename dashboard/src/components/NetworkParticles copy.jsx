import { useState, useEffect, useRef } from "react";

// ---------- Mode 0: Drift (cyan drifting particles with connections) ----------
const DriftParticles = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let particles = [];
    const PARTICLE_COUNT = 100;
    const CONNECTION_DISTANCE = 80;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    class Particle {
      constructor(width, height) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.size = Math.random() * 2 + 1;
      }
      update(width, height) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
      }
      draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(6, 182, 212, 0.7)";
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
    };

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < CONNECTION_DISTANCE) {
            const opacity = (1 - distance / CONNECTION_DISTANCE) * 0.3;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.update(canvas.width, canvas.height);
        p.draw(ctx);
      }
      drawConnections();
      animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    initParticles();
    animate();

    window.addEventListener("resize", () => {
      resizeCanvas();
      initParticles();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gradient-to-br from-slate-900/30 to-slate-950/30 backdrop-blur-sm border border-white/10">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

// ---------- Mode 1: Haze (purple particles with repulsion and jitter) ----------
const HazeParticles = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let particles = [];

    const PARTICLE_COUNT = 80;
    const REPULSION_RADIUS = 70;
    const CONNECTION_MIN = 50;
    const CONNECTION_MAX = 90;
    const JITTER_STRENGTH = 0.03;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    class Particle {
      constructor(width, height) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.size = Math.random() * 2 + 1;
      }

      applyRepulsion(particles) {
        for (const other of particles) {
          if (other === this) continue;
          const dx = this.x - other.x;
          const dy = this.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REPULSION_RADIUS && dist > 0.1) {
            const force = (REPULSION_RADIUS - dist) / REPULSION_RADIUS;
            this.vx += (dx / dist) * force * 0.02;
            this.vy += (dy / dist) * force * 0.02;
          }
        }
      }

      update(width, height, particles) {
        this.applyRepulsion(particles);
        this.vx += (Math.random() - 0.5) * JITTER_STRENGTH;
        this.vy += (Math.random() - 0.5) * JITTER_STRENGTH;
        this.vx *= 0.97;
        this.vy *= 0.97;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) { this.x = 0; this.vx = -this.vx; }
        if (this.x > width) { this.x = width; this.vx = -this.vx; }
        if (this.y < 0) { this.y = 0; this.vy = -this.vy; }
        if (this.y > height) { this.y = height; this.vy = -this.vy; }
      }

      draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(168, 85, 247, 0.8)";
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
    };

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > CONNECTION_MIN && distance < CONNECTION_MAX) {
            const opacity = (distance - CONNECTION_MIN) / (CONNECTION_MAX - CONNECTION_MIN);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(192, 132, 252, ${opacity * 0.25})`;
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.update(canvas.width, canvas.height, particles);
        p.draw(ctx);
      }
      drawConnections();
      animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    initParticles();
    animate();

    window.addEventListener("resize", () => {
      resizeCanvas();
      initParticles();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gradient-to-br from-slate-900/40 to-slate-950/40 backdrop-blur-sm border border-white/10">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

// ---------- Mode 2: State (white static dots, snapshot every 8 seconds, glow implodes in 0.7s, then subtle settle) ----------
const StateParticles = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let particles = [];
    let settleStart = 0;           // timestamp when settling begins
    let settleOffsets = [];        // per-particle offset {dx, dy}
    const PARTICLE_COUNT = 100;
    const CONNECTION_DISTANCE = 80;
    let lastUpdate = 0;
    const UPDATE_INTERVAL = 8000;   // 8 seconds between snapshots
    const DECAY_DURATION = 700;     // glow implodes in 0.7 seconds
    const SETTLE_DURATION = 300;    // particles wiggle for 0.3 seconds after jump
    const MAX_GLOW_RADIUS = 12;     // max glow radius

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    // Generate random positions for all particles (target positions)
    const randomizePositions = () => {
      for (const p of particles) {
        p.targetX = Math.random() * canvas.width;
        p.targetY = Math.random() * canvas.height;
        p.x = p.targetX;
        p.y = p.targetY;
      }
      // Reset settle offsets
      settleOffsets = particles.map(() => ({ dx: 0, dy: 0 }));
    };

    class Particle {
      constructor(width, height) {
        this.targetX = Math.random() * width;
        this.targetY = Math.random() * height;
        this.x = this.targetX;
        this.y = this.targetY;
        this.size = Math.random() * 2 + 1.5;
      }
      draw(ctx, glowIntensity, offsetX, offsetY) {
        // Apply settle offset
        const drawX = this.x + offsetX;
        const drawY = this.y + offsetY;

        // Soft glow using radial gradient
        const glowRadius = this.size + MAX_GLOW_RADIUS * glowIntensity;
        const gradient = ctx.createRadialGradient(
          drawX, drawY, this.size * 0.5,
          drawX, drawY, glowRadius
        );
        const innerOpacity = 0.6 + glowIntensity * 0.4;
        gradient.addColorStop(0, `rgba(255, 255, 255, ${innerOpacity})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        
        ctx.beginPath();
        ctx.arc(drawX, drawY, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core particle
        const coreOpacity = 0.7 + glowIntensity * 0.3;
        ctx.beginPath();
        ctx.arc(drawX, drawY, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${coreOpacity})`;
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
    };

    const drawConnections = (offsets) => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = (p1.x + offsets[i].dx) - (p2.x + offsets[j].dx);
          const dy = (p1.y + offsets[i].dy) - (p2.y + offsets[j].dy);
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < CONNECTION_DISTANCE) {
            const opacity = (1 - distance / CONNECTION_DISTANCE) * 0.25;
            ctx.beginPath();
            ctx.moveTo(p1.x + offsets[i].dx, p1.y + offsets[i].dy);
            ctx.lineTo(p2.x + offsets[j].dx, p2.y + offsets[j].dy);
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.stroke();
          }
        }
      }
    };

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp) => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const elapsed = timestamp - lastUpdate;

      // ---- Glow intensity ----
      let glowIntensity = 0;
      if (elapsed < UPDATE_INTERVAL) {
        if (elapsed < DECAY_DURATION) {
          let t = elapsed / DECAY_DURATION;
          t = easeOutCubic(t);
          glowIntensity = 1 - t;
        } else {
          glowIntensity = 0;
        }
      }

      // ---- Settle wiggle offsets ----
      // Reset offsets if not in settle period
      let settleFactor = 0;
      if (elapsed < SETTLE_DURATION) {
        settleFactor = 1 - (elapsed / SETTLE_DURATION); // 1 → 0
      } else {
        settleFactor = 0;
      }
      // Generate random offsets that decay to 0
      for (let i = 0; i < particles.length; i++) {
        if (settleFactor > 0) {
          // Random offset up to 3 pixels, scaled by settleFactor
          const maxOffset = 3 * settleFactor;
          settleOffsets[i].dx = (Math.random() - 0.5) * maxOffset;
          settleOffsets[i].dy = (Math.random() - 0.5) * maxOffset;
        } else {
          settleOffsets[i].dx = 0;
          settleOffsets[i].dy = 0;
        }
      }

      // Draw particles with offsets
      for (let i = 0; i < particles.length; i++) {
        particles[i].draw(ctx, glowIntensity, settleOffsets[i].dx, settleOffsets[i].dy);
      }
      drawConnections(settleOffsets);

      // ---- Update positions at the end of interval ----
      if (timestamp - lastUpdate >= UPDATE_INTERVAL) {
        randomizePositions();
        lastUpdate = timestamp;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    initParticles();
    randomizePositions();
    lastUpdate = performance.now();
    animate(lastUpdate);

    window.addEventListener("resize", () => {
      resizeCanvas();
      randomizePositions();
      lastUpdate = performance.now();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gradient-to-br from-slate-900/30 to-slate-950/30 backdrop-blur-sm border border-white/10">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

// ---------- Main Toggle Component (cycles through all three modes) ----------
const ToggleNetworkParticles = () => {
  const [variant, setVariant] = useState(0); // 0 = Drift, 1 = Haze, 2 = State
  const [showTitle, setShowTitle] = useState(false);
  const [titleText, setTitleText] = useState("");
  const timeoutRef = useRef(null);

  const handleClick = () => {
    const newVariant = (variant + 1) % 3;
    const newTitle = newVariant === 0 ? "Drift" : newVariant === 1 ? "Haze" : "State";
    
    setVariant(newVariant);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTitleText(newTitle);
    setShowTitle(true);
    timeoutRef.current = setTimeout(() => {
      setShowTitle(false);
    }, 1000);
  };

  return (
    <div
      onClick={handleClick}
      className="relative cursor-pointer transition-transform active:scale-[0.99]"
      title="Click to switch particle mode"
    >
      {variant === 0 && <DriftParticles />}
      {variant === 1 && <HazeParticles />}
      {variant === 2 && <StateParticles />}
      
      {showTitle && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-pulse">
          <p className="text-sm font-medium text-white/80 bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-lg">
            {titleText}
          </p>
        </div>
      )}
    </div>
  );
};

export default ToggleNetworkParticles;