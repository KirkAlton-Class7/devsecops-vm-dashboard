import { useState, useEffect, useRef } from "react";

// Blue particle mode – now called "Drift"
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

// Purple particle mode – now called "Haze"
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

// Main toggle component with transient title overlay
const ToggleNetworkParticles = () => {
  const [variant, setVariant] = useState(0); // 0 = Drift, 1 = Haze
  const [showTitle, setShowTitle] = useState(false);
  const [titleText, setTitleText] = useState("");
  const timeoutRef = useRef(null);

  const handleClick = () => {
    // Determine new variant and its title
    const newVariant = variant === 0 ? 1 : 0;
    const newTitle = newVariant === 0 ? "Drift" : "Haze";
    
    // Update variant
    setVariant(newVariant);
    
    // Show title overlay
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
      {variant === 0 ? <DriftParticles /> : <HazeParticles />}
      
      {/* Transient title overlay */}
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