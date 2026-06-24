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

        // 先算每个粒子的透明度
        const alphas = this.particles.map(p => {
            if (p.mouseDist < this.mouse.radius) {
                const t = 1 - p.mouseDist / this.mouse.radius;
                return 0.55 + t * 0.3;
            }
            return 0.55;
        });

        // Connections — 渐变透明度
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const pi = this.particles[i], pj = this.particles[j];
                const dx = pi.x - pj.x;
                const dy = pi.y - pj.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.connectionDistance) {
                    const baseOpacity = (1 - dist / this.connectionDistance) * 0.5;
                    const alphaI = Math.min(0.8, alphas[i] * baseOpacity * 2);
                    const alphaJ = Math.min(0.8, alphas[j] * baseOpacity * 2);

                    const grad = this.ctx.createLinearGradient(pi.x, pi.y, pj.x, pj.y);
                    grad.addColorStop(0, `rgba(${r},${g},${b},${alphaI})`);
                    grad.addColorStop(1, `rgba(${r},${g},${b},${alphaJ})`);

                    const avgMouseDist = Math.min(pi.mouseDist, pj.mouseDist);
                    const mouseFactor = avgMouseDist < this.mouse.radius ? 1 - avgMouseDist / this.mouse.radius : 0;

                    this.ctx.strokeStyle = grad;
                    this.ctx.lineWidth = mouseFactor > 0.3 ? 1.8 : 1.0;
                    this.ctx.beginPath();
                    this.ctx.moveTo(pi.x, pi.y);
                    this.ctx.lineTo(pj.x, pj.y);
                    this.ctx.stroke();
                }
            }
        }

        // Particles — 动态透明度 [0.25, 0.85]
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const alpha = alphas[i];
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
