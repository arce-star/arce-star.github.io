// Quantum Sea — 粒子背景动画 (adapted from madevolve.org)
class QuantumSea {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: null, y: null, radius: 160 };
        this.particleCount = 70;
        this.connectionDistance = 150;
        this.color = [15, 75, 145]; // theme blue

        this.init();
        this.animate();
        this.setupListeners();
    }

    init() {
        this.resize();
        this.createParticles();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.2 + Math.random() * 0.4;
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 2.5 + 1.2
            });
        }
    }

    setupListeners() {
        document.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        document.addEventListener('mouseleave', () => {
            this.mouse.x = null; this.mouse.y = null;
        });
        window.addEventListener('resize', () => this.resize());
    }

    update() {
        for (let p of this.particles) {
            let mouseDist = Infinity;
            if (this.mouse.x !== null) {
                const dx = this.mouse.x - p.x;
                const dy = this.mouse.y - p.y;
                mouseDist = Math.sqrt(dx * dx + dy * dy);
                if (mouseDist < this.mouse.radius) {
                    const force = (this.mouse.radius - mouseDist) / this.mouse.radius;
                    p.vx += (dx / mouseDist) * force * 0.03;
                    p.vy += (dy / mouseDist) * force * 0.03;
                }
            }
            p.mouseDist = mouseDist; // 记录与鼠标距离
            // Damping
            p.vx *= 0.995;
            p.vy *= 0.995;
            // Move
            p.x += p.vx;
            p.y += p.vy;
            // Wrap
            if (p.x < -10) p.x = this.canvas.width + 10;
            if (p.x > this.canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = this.canvas.height + 10;
            if (p.y > this.canvas.height + 10) p.y = -10;
        }
    }

    draw() {
        const [r, g, b] = this.color;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Connections
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.connectionDistance) {
                    // 连线透明度也受鼠标影响：两端粒子越靠近鼠标越明显
                    const avgMouseDist = Math.min(this.particles[i].mouseDist, this.particles[j].mouseDist);
                    const mouseFactor = avgMouseDist < this.mouse.radius ? 1 - avgMouseDist / this.mouse.radius : 0;
                    const baseOpacity = (1 - dist / this.connectionDistance) * 0.5;
                    const opacity = baseOpacity + mouseFactor * 0.25;
                    this.ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(0.8, opacity)})`;
                    this.ctx.lineWidth = mouseFactor > 0.3 ? 1.8 : 1.0;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }

        // Particles — 动态透明度 [0.2, 0.8] 越靠近鼠标越明显
        for (let p of this.particles) {
            let alpha = 0.25;
            if (p.mouseDist < this.mouse.radius) {
                const t = 1 - p.mouseDist / this.mouse.radius; // 0(远) → 1(近)
                alpha = 0.25 + t * 0.6; // [0.25, 0.85]
            }
            const radius = p.mouseDist < this.mouse.radius
                ? p.radius * (1.3 + 0.4 * (1 - p.mouseDist / this.mouse.radius))
                : p.radius;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            this.ctx.fill();
        }
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}
