// MOTOR DE RENDERIZAÇÃO DO SIMULADOR DE LANÇAMENTO OBLÍQUO INFANTIL
// Este arquivo gerencia todos os desenhos no Canvas HTML5, animações de fundo e partículas.

const Renderer = {
    canvas: null,
    ctx: null,
    planet: null,
    projectileConfig: null,
    pixelsPerMeter: CONFIG.PIXELS_PER_METER,

    // Posições base do simulador
    launchX: 80, // Distância do canhão em relação à esquerda
    groundYOffset: 80, // Distância do solo em relação à base do canvas

    // Estado da animação de fundo
    clouds: [],
    particles: [],
    stars: [], // Para mundos espaciais como a Lua e Júpiter

    // Sprites offscreen dos emojis (imagens pré-renderizadas)
    emojiSprites: {},

    /**
     * Inicializa o renderizador com o elemento Canvas.
     * @param {HTMLCanvasElement} canvasElement 
     */
    init(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.resize();

        // Inicializar algumas nuvens aleatórias
        this.clouds = [
            { x: 100, y: 50, speed: 0.1, size: 40 },
            { x: 400, y: 80, speed: 0.15, size: 55 },
            { x: 700, y: 40, speed: 0.08, size: 45 },
            { x: 900, y: 100, speed: 0.12, size: 50 }
        ];

        // Inicializar estrelas se for céu escuro
        this.stars = [];
        for (let i = 0; i < 60; i++) {
            this.stars.push({
                x: Math.random() * 2000,
                y: Math.random() * 500,
                size: Math.random() * 2 + 1,
                blinkSpeed: 0.02 + Math.random() * 0.05,
                alpha: Math.random()
            });
        }

        // Pré-renderizar todos os emojis como sprites offscreen
        this.buildEmojiSprites();
    },

    /**
     * Gera imagens offscreen para todos os emojis usados no jogo.
     * Isso evita problemas de renderização de emoji via fillText no Canvas.
     */
    buildEmojiSprites() {
        const emojis = {};
        // Emojis dos projéteis
        Object.values(CONFIG.PROJECTILES).forEach(p => {
            emojis[p.emoji] = Math.max(28, p.radius * 2.6);
        });
        // Emoji da estrela de vitória e do canhão
        emojis["⭐"] = 40;
        emojis["🤖"] = 32;

        Object.keys(emojis).forEach(emoji => {
            const size = emojis[emoji];
            const offCanvas = document.createElement("canvas");
            const pad = 16; // padding extra para sombra/rotação
            offCanvas.width = size + pad * 2;
            offCanvas.height = size + pad * 2;
            const offCtx = offCanvas.getContext("2d");

            offCtx.textAlign = "center";
            offCtx.textBaseline = "middle";
            offCtx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
            offCtx.fillText(emoji, offCanvas.width / 2, offCanvas.height / 2);

            this.emojiSprites[emoji] = offCanvas;
        });
    },

    /**
     * Ajusta as dimensões do canvas baseadas na tela.
     */
    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        // Altura mínima para o jogo caber confortavelmente em desktop e celular
        this.canvas.height = Math.max(380, window.innerHeight * 0.5);
    },

    /**
     * Define o planeta atual para ajustar cores e gravidade.
     * @param {string} planetKey 
     */
    setPlanet(planetKey) {
        this.planet = CONFIG.PLANETS[planetKey];
    },

    /**
     * Define o projétil atual para ajustar o desenho e efeitos.
     * @param {string} projKey 
     */
    setProjectile(projKey) {
        this.projectileConfig = CONFIG.PROJECTILES[projKey];
    },

    /**
     * Ajusta dinamicamente a escala do simulador para que toda a trajetória caiba na tela.
     * @param {number} maxDistance - Distância horizontal máxima do voo (metros).
     * @param {number} maxHeight - Altura máxima do voo (metros).
     */
    adjustScale(maxDistance, maxHeight) {
        const targetWidth = this.canvas.width - this.launchX - 100;
        const targetHeight = this.canvas.height - this.groundYOffset - 100;

        // Evitar divisão por zero ou escalas muito absurdas com valores padrão
        const dist = Math.max(1, maxDistance);
        const height = Math.max(1, maxHeight);

        const scaleX = targetWidth / dist;
        const scaleY = targetHeight / height;

        // Queremos uma escala uniforme (1 pixel por metro em X e Y idênticos)
        let scale = Math.min(scaleX, scaleY);

        // Limita a escala para evitar zoom extremo
        scale = Math.max(1.8, Math.min(30, scale));

        this.pixelsPerMeter = scale;
    },

    /**
     * Converte coordenadas físicas (metros) para coordenadas do Canvas (pixels).
     * @param {number} x - Posição X física.
     * @param {number} y - Posição Y física.
     * @returns {{x: number, y: number}} Coordenadas no Canvas.
     */
    physToCanvas(x, y) {
        const groundY = this.canvas.height - this.groundYOffset;
        return {
            x: this.launchX + (x * this.pixelsPerMeter),
            y: groundY - (y * this.pixelsPerMeter)
        };
    },

    /**
     * Desenha o fundo completo do simulador.
     */
    drawBackground() {
        const ctx = this.ctx;
        if (!ctx || !this.canvas) return;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const groundY = height - this.groundYOffset;

        // 1. Limpar tela
        ctx.clearRect(0, 0, width, height);

        // 2. Céu com degradê do planeta
        const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
        const colors = this.planet.skyColor.match(/#[0-9a-fA-F]{6}/g);
        if (colors && colors.length >= 2) {
            skyGrad.addColorStop(0, colors[0]);
            skyGrad.addColorStop(1, colors[1]);
        } else {
            skyGrad.addColorStop(0, "#a1c4fd");
            skyGrad.addColorStop(1, "#c2e9fb");
        }
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, groundY);

        // 3. Estrelas piscantes (se for céu noturno/espaço - Lua ou Júpiter)
        if (this.planet.name.includes("Lua") || this.planet.name.includes("Júpiter")) {
            ctx.fillStyle = "#ffffff";
            this.stars.forEach(star => {
                star.alpha += star.blinkSpeed;
                if (star.alpha > 1 || star.alpha < 0) {
                    star.blinkSpeed = -star.blinkSpeed;
                }
                ctx.globalAlpha = Math.max(0.1, Math.min(1, star.alpha));
                ctx.fillRect(star.x, star.y, star.size, star.size);
            });
            ctx.globalAlpha = 1.0; // Resetar
        } else {
            // Desenhar um sol bonito se for Terra ou Marte
            ctx.beginPath();
            ctx.arc(width - 100, 70, 35, 0, Math.PI * 2);
            ctx.fillStyle = this.planet.name.includes("Marte") ? "#ffcc33" : "#ffe853";
            ctx.shadowBlur = 20;
            ctx.shadowColor = ctx.fillStyle;
            ctx.fill();
            ctx.shadowBlur = 0; // Resetar sombra
        }

        // 4. Nuvens (se não for a Lua)
        if (!this.planet.name.includes("Lua")) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
            this.clouds.forEach(cloud => {
                // Atualizar posição horizontal
                cloud.x += cloud.speed;
                if (cloud.x - cloud.size * 2 > width) {
                    cloud.x = -cloud.size * 2;
                }

                // Desenhar formato fofo de nuvem (várias bolhas juntas)
                ctx.beginPath();
                ctx.arc(cloud.x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloud.size * 0.4, cloud.y - cloud.size * 0.2, cloud.size * 0.6, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloud.size * 0.8, cloud.y, cloud.size * 0.5, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloud.size * 0.4, cloud.y + cloud.size * 0.1, cloud.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // 5. Desenhar o solo
        ctx.fillStyle = this.planet.groundColor;
        ctx.fillRect(0, groundY, width, this.groundYOffset);

        // Borda superior do solo (grama/relevo)
        ctx.fillStyle = this.planet.groundColor === "#228B22" ? "#1e721e" : "#555555"; // Verde mais escuro ou cinza escuro
        ctx.fillRect(0, groundY, width, 6);

        // Régua de medição estilizada (para ajudar a entender distância física)
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        
        const meterInterval = 10; // Desenhar marcação a cada 10 metros
        const maxMeter = Math.ceil(width / this.pixelsPerMeter);

        for (let m = 0; m <= maxMeter; m += meterInterval) {
            if (m === 0) continue;
            const screenPos = this.physToCanvas(m, 0);
            if (screenPos.x > width) break;

            // Linha da marca
            ctx.fillRect(screenPos.x - 1, groundY + 6, 2, 8);
            // Texto
            ctx.fillText(`${m}m`, screenPos.x, groundY + 26);
        }

        // Régua de medição Y (Altura) na lateral esquerda
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        const maxYMeter = Math.ceil(groundY / this.pixelsPerMeter);

        for (let m = 0; m <= maxYMeter; m += meterInterval) {
            if (m === 0) continue;
            const screenPos = this.physToCanvas(0, m);
            if (screenPos.y < 0) break;

            // Linha da marca
            ctx.fillRect(0, screenPos.y - 1, 8, 2);
            // Texto
            ctx.fillText(`${m}m`, 32, screenPos.y);
        }
    },

    /**
     * Desenha o canhão lançador rotacionado.
     * @param {number} angleDegrees - Ângulo em graus.
     */
    drawCannon(angleDegrees) {
        const ctx = this.ctx;
        const groundY = this.canvas.height - this.groundYOffset;
        const rad = Physics.degreesToRadians(angleDegrees);

        ctx.save();
        ctx.translate(this.launchX, groundY);

        // Desenhar a base/rodas do canhão (estilo desenho animado)
        ctx.fillStyle = "#4a4a4a";
        ctx.beginPath();
        ctx.arc(0, -10, 20, Math.PI, 0, false); // Base semicircular
        ctx.fill();

        // Roda grande e amigável
        ctx.beginPath();
        ctx.arc(0, -10, 12, 0, Math.PI * 2);
        ctx.fillStyle = "#d35400"; // Laranja amigável
        ctx.fill();
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Linha interna dos raios da roda
        ctx.beginPath();
        ctx.arc(0, -10, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#3e2723";
        ctx.fill();

        // Corpo do canhão (o cano que rotaciona)
        ctx.rotate(-rad); // Inverter no canvas porque o Y cresce para baixo, logo rotação padrão anti-horária precisa de sinal negativo

        // Desenhar o cano principal
        ctx.fillStyle = "#7f8c8d";
        ctx.strokeStyle = "#34495e";
        ctx.lineWidth = 3;
        
        // Retângulo arredondado do cano
        const barrelLength = 40;
        const barrelWidth = 18;
        
        ctx.beginPath();
        ctx.roundRect(0, -barrelWidth / 2, barrelLength, barrelWidth, 5);
        ctx.fill();
        ctx.stroke();

        // Boca do canhão (detalhe colorido na ponta)
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(barrelLength - 5, -barrelWidth / 2 - 2, 6, barrelWidth + 4);
        ctx.strokeRect(barrelLength - 5, -barrelWidth / 2 - 2, 6, barrelWidth + 4);

        ctx.restore();
    },

    /**
     * Desenha a linha de trajetória pontilhada (previsão).
     * @param {Array<{x: number, y: number}>} points 
     */
    drawTrajectoryPrediction(points) {
        if (points.length < 2) return;
        const ctx = this.ctx;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 8]); // Traços pontilhados
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 3;

        const start = this.physToCanvas(points[0].x, points[0].y);
        ctx.moveTo(start.x, start.y);

        for (let i = 1; i < points.length; i++) {
            const next = this.physToCanvas(points[i].x, points[i].y);
            // Não desenhar abaixo do nível do chão
            if (next.y > this.canvas.height - this.groundYOffset) {
                // Desenhar até tocar a linha do solo
                const groundY = this.canvas.height - this.groundYOffset;
                ctx.lineTo(next.x, groundY);
                break;
            }
            ctx.lineTo(next.x, next.y);
        }

        ctx.stroke();
        ctx.restore();
    },

    /**
     * Desenha a linha sólida por onde o projétil já passou.
     * @param {Array<{x: number, y: number}>} points 
     * @param {number} maxIndex - Índice até onde desenhar.
     */
    drawActiveTrajectory(points, maxIndex) {
        if (points.length < 2 || maxIndex < 1) return;
        const ctx = this.ctx;

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = this.projectileConfig.trailColor;
        ctx.lineWidth = 6;
        ctx.lineCap = "round";

        const start = this.physToCanvas(points[0].x, points[0].y);
        ctx.moveTo(start.x, start.y);

        const limit = Math.min(points.length, maxIndex + 1);
        for (let i = 1; i < limit; i++) {
            const next = this.physToCanvas(points[i].x, points[i].y);
            ctx.lineTo(next.x, next.y);
        }

        ctx.stroke();
        ctx.restore();
    },

    drawProjectile(x, y, angleRad) {
        const ctx = this.ctx;
        const screenPos = this.physToCanvas(x, y);
        const sprite = this.emojiSprites[this.projectileConfig.emoji];

        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(-angleRad);

        if (sprite) {
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 8;
            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
            ctx.shadowBlur = 0;
        } else {
            ctx.globalAlpha = 1.0;
            ctx.font = `${Math.max(28, this.projectileConfig.radius * 2.6)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(this.projectileConfig.emoji, 0, 0);
        }

        ctx.restore();
    },

    /**
     * Desenha o alvo do jogo.
     * @param {number} targetX - Posição física X do alvo.
     * @param {boolean} isHit - Se o alvo foi atingido nesta jogada.
     */
    drawTarget(targetX, isHit) {
        if (isHit) {
            const ctx = this.ctx;
            const groundY = this.canvas.height - this.groundYOffset;
            const screenPos = this.physToCanvas(targetX, 0);
            const starSprite = this.emojiSprites[""];

            ctx.save();
            ctx.translate(screenPos.x, groundY);
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#f1c40f";

            if (starSprite) {
                ctx.drawImage(starSprite, -starSprite.width / 2, -starSprite.height / 2 - 10);
            } else {
                ctx.fillStyle = "#f1c40f";
                ctx.font = "40px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillText("", 0, 10);
            }
            
            //ctx.font = "bold 14px Outfit, sans-serif";
            //ctx.fillStyle = "#ffffff";
            //ctx.fillText("COMPLETADO!", 0, -35);
            ctx.restore();
        }
    },

    /**
     * Cria partículas na colisão.
     * @param {number} x - Posição X física.
     * @param {number} y - Posição Y física.
     */
    createImpactParticles(x, y) {
        const screenPos = this.physToCanvas(x, y);
        const count = this.projectileConfig.impactParticles;
        const color = this.projectileConfig.impactColor;
        const type = this.projectileConfig.impactType;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI - Math.PI; // Meio círculo superior
            const speed = 2 + Math.random() * 5;
            
            this.particles.push({
                x: screenPos.x,
                y: screenPos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 6,
                color: color,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                gravity: 0.15, // Gravidade própria das partículas
                type: type
            });
        }
    },

    /**
     * Cria confetes festivos se a criança acertar o alvo.
     * @param {number} targetX - Posição X física do alvo.
     */
    createCelebrationConfetti(targetX) {
        const groundY = this.canvas.height - this.groundYOffset;
        const screenPos = this.physToCanvas(targetX, 0);
        const colors = ["#ff5252", "#ffeb3b", "#2196f3", "#4caf50", "#e040fb", "#ff9800"];

        for (let i = 0; i < 60; i++) {
            const angle = -Math.PI/2 + (Math.random() * 1.0 - 0.5); // Atirar para cima inclinando levemente
            const speed = 5 + Math.random() * 8;
            
            this.particles.push({
                x: screenPos.x,
                y: groundY - 25,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1.0,
                decay: 0.01 + Math.random() * 0.015,
                gravity: 0.2,
                type: "confetti",
                shape: Math.random() > 0.5 ? "circle" : "rect"
            });
        }
    },

    /**
     * Atualiza e desenha todas as partículas na tela.
     */
    drawParticles() {
        const ctx = this.ctx;
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Atualizar física da partícula
            p.x += p.vx;
            p.vy += p.gravity;
            p.y += p.vy;
            p.alpha -= p.decay;

            // Remover se sumiu
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;

            if (p.type === "confetti" && p.shape === "rect") {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.x * 0.05);
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size * 1.5);
            } else if (p.type === "wood") {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.alpha * 6.28); // Rotação dos estilhaços
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            } else {
                // Formato circular padrão
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }
    },

    /**
     * Cria estilhaços de caixas de madeira na colisão.
     */
    createWoodSplinters(x, y) {
        const screenPos = this.physToCanvas(x, y);
        const count = 15;
        const colors = ["#8d6e63", "#a1887f", "#d7ccc8", "#5d4037"];
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4;
            
            this.particles.push({
                x: screenPos.x,
                y: screenPos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5, // Leve impulso para cima
                size: 3 + Math.random() * 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                gravity: 0.15,
                type: "wood"
            });
        }
    },

    /**
     * Desenha a corda elástica puxando o projétil (estilo Angry Birds).
     */
    drawElastic(dragX, dragY) {
        const ctx = this.ctx;
        const groundY = this.canvas.height - this.groundYOffset;
        const anchorX = this.launchX;
        const anchorY = groundY - 10;
        
        ctx.save();
        
        // Elástico de borracha grosso
        ctx.strokeStyle = "#5d4037"; // Marrom escuro da borracha
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        ctx.beginPath();
        ctx.moveTo(anchorX, anchorY);
        ctx.lineTo(dragX, dragY);
        ctx.stroke();

        // Bolsa de couro do estilingue
        ctx.fillStyle = "#3e2723";
        ctx.beginPath();
        ctx.arc(dragX, dragY, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    },

    /**
     * Desenha caixas e formatos geométricos de madeira empilhados no cenário (estilo Angry Birds).
     */
    drawCrates(crates) {
        const ctx = this.ctx;
        const groundY = this.canvas.height - this.groundYOffset;

        crates.forEach(crate => {
            if (crate.isBroken) return;

            const screenPos = this.physToCanvas(crate.x, crate.y);
            const w = crate.width * this.pixelsPerMeter;
            const h = crate.height * this.pixelsPerMeter;

            ctx.save();
            // Centralizado na horizontal e apoiado no chão na vertical
            ctx.translate(screenPos.x - w / 2, screenPos.y - h);

            // Cores e estilos do bloco
            const woodColor = "#cd853f"; // Bege de madeira
            const strokeColor = "#5c3a21"; // Marrom escuro para contorno
            const strokeWidth = Math.max(2, this.pixelsPerMeter * 0.12);

            ctx.fillStyle = woodColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;

            if (crate.type === 'column') {
                // Pilar vertical
                ctx.fillRect(0, 0, w, h);
                ctx.strokeRect(0, 0, w, h);

                // Grão da madeira vertical
                ctx.beginPath();
                ctx.moveTo(w * 0.3, 0);
                ctx.lineTo(w * 0.3, h);
                ctx.moveTo(w * 0.7, 0);
                ctx.lineTo(w * 0.7, h);
                ctx.stroke();

                // Detalhe de parafusos/junções nas extremidades
                ctx.fillStyle = strokeColor;
                ctx.beginPath();
                ctx.arc(w / 2, w / 2, Math.max(2.5, w * 0.15), 0, Math.PI * 2);
                ctx.arc(w / 2, h - w / 2, Math.max(2.5, w * 0.15), 0, Math.PI * 2);
                ctx.fill();
            } else if (crate.type === 'beam') {
                // Viga horizontal
                ctx.fillRect(0, 0, w, h);
                ctx.strokeRect(0, 0, w, h);

                // Grão da madeira horizontal
                ctx.beginPath();
                ctx.moveTo(0, h * 0.3);
                ctx.lineTo(w, h * 0.3);
                ctx.moveTo(0, h * 0.7);
                ctx.lineTo(w, h * 0.7);
                ctx.stroke();

                // Detalhe de parafusos nas pontas da viga
                ctx.fillStyle = strokeColor;
                ctx.beginPath();
                ctx.arc(h / 2, h / 2, Math.max(2.5, h * 0.15), 0, Math.PI * 2);
                ctx.arc(w - h / 2, h / 2, Math.max(2.5, h * 0.15), 0, Math.PI * 2);
                ctx.fill();
            } else if (crate.type === 'triangle') {
                // Telhado triangular
                ctx.beginPath();
                ctx.moveTo(w / 2, 0);
                ctx.lineTo(w, h);
                ctx.lineTo(0, h);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Linha de detalhe interno
                ctx.beginPath();
                ctx.moveTo(w / 2, h * 0.35);
                ctx.lineTo(w * 0.8, h * 0.9);
                ctx.lineTo(w * 0.2, h * 0.9);
                ctx.closePath();
                ctx.stroke();
            } else {
                // Caixa quadrada (crate padrão)
                ctx.fillRect(0, 0, w, h);
                ctx.strokeRect(0, 0, w, h);

                // O X clássico de caixas de carga de madeira
                ctx.beginPath();
                ctx.moveTo(4, 4);
                ctx.lineTo(w - 4, h - 4);
                ctx.moveTo(w - 4, 4);
                ctx.lineTo(4, h - 4);
                ctx.stroke();
            }

            ctx.restore();
        });
    },

    /**
     * Desenha a curva do rastro da tentativa anterior em cinza claro.
     */
    drawPreviousTrajectory(points) {
        if (!points || points.length < 2) return;
        const ctx = this.ctx;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)"; // Branco/cinza translúcido
        ctx.lineWidth = 2.5;

        const start = this.physToCanvas(points[0].x, points[0].y);
        ctx.moveTo(start.x, start.y);

        for (let i = 1; i < points.length; i++) {
            const next = this.physToCanvas(points[i].x, points[i].y);
            if (next.y > this.canvas.height - this.groundYOffset) {
                ctx.lineTo(next.x, this.canvas.height - this.groundYOffset);
                break;
            }
            ctx.lineTo(next.x, next.y);
        }

        ctx.stroke();
        ctx.restore();
    },

    /**
     * Desenha as setas dos vetores de velocidade com labels visíveis.
     * @param {number} x - Posição X física.
     * @param {number} y - Posição Y física.
     * @param {number} vx - Velocidade física horizontal.
     * @param {number} vy - Velocidade física vertical.
     */
    drawVectors(x, y, vx, vy) {
        const ctx = this.ctx;
        const start = this.physToCanvas(x, y);
        
        // Multiplicador visual para a seta do vetor não ficar minúscula ou gigante
        const vectorScale = 2.2;

        // 1. Vetor Horizontal (Vx) - Azul Celeste
        if (Math.abs(vx) > 0.05) {
            const endX = start.x + (vx * vectorScale * this.pixelsPerMeter * 0.22);
            this.drawArrow(start.x, start.y, endX, start.y, "#00b4d8", 4);

            ctx.save();
            ctx.fillStyle = "#003049";
            ctx.font = "bold 12px Outfit, sans-serif";
            const bg = `${Math.abs(vx).toFixed(1)} m/s`;
            const labelX = endX + (vx > 0 ? 6 : -6);
            ctx.textAlign = vx > 0 ? "left" : "right";
            // Caixa de fundo para legibilidade
            const tw = ctx.measureText(`Vx: ${bg}`).width + 6;
            ctx.fillStyle = "rgba(0, 70, 120, 0.75)";
            ctx.beginPath();
            ctx.roundRect(vx > 0 ? labelX - 3 : labelX - tw + 3, start.y - 10, tw, 20, 4);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.fillText(`Vx: ${bg}`, labelX, start.y + 4);
            ctx.restore();
        }

        // 2. Vetor Vertical (Vy) - Verde se subindo, Vermelho se descendo
        if (Math.abs(vy) > 0.05) {
            const endY = start.y - (vy * vectorScale * this.pixelsPerMeter * 0.22);
            const vyColor = vy > 0 ? "#06d6a0" : "#ef476f";
            this.drawArrow(start.x, start.y, start.x, endY, vyColor, 4);

            ctx.save();
            ctx.textAlign = "left";
            const bg2 = `${Math.abs(vy).toFixed(1)} m/s`;
            const dir = vy > 0 ? "↑" : "↓";
            const tw2 = ctx.measureText(`Vy: ${dir}${bg2}`).width + 6;
            ctx.font = "bold 12px Outfit, sans-serif";
            ctx.fillStyle = `rgba(${vy > 0 ? "6,100,60" : "120,20,40"}, 0.8)`;
            ctx.beginPath();
            ctx.roundRect(start.x + 5, endY - 10, tw2, 20, 4);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.fillText(`Vy: ${dir}${bg2}`, start.x + 8, endY + 4);
            ctx.restore();
        }
    },

    /**
     * Desenha o painel HUD de vetores em tempo real no canto superior do canvas.
     * @param {number} vx - Velocidade horizontal atual.
     * @param {number} vy - Velocidade vertical atual.
     * @param {number} v0x - Velocidade horizontal inicial (para normalização das barras).
     * @param {number} v0y - Velocidade vertical inicial (para normalização das barras).
     */
    drawVectorPanel(vx, vy, v0x, v0y) {
        const ctx = this.ctx;
        if (!ctx) return;

        const panelX = 12;
        const panelY = 12;
        const panelW = 210;
        const panelH = 115;
        const barW = 130;
        const barH = 14;

        // Fundo com glassmorphism
        ctx.save();
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = "#0a0e27";
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 10);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Borda sutil
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Título
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px Outfit, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("📊 Vetores em Tempo Real", panelX + 10, panelY + 18);

        // --- Vx ---
        const vxRatio = Math.min(1, Math.abs(vx) / Math.max(1, Math.abs(v0x)));
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        ctx.roundRect(panelX + 10, panelY + 28, barW, barH, 5);
        ctx.fill();
        ctx.fillStyle = "#00b4d8";
        ctx.beginPath();
        ctx.roundRect(panelX + 10, panelY + 28, barW * vxRatio, barH, 5);
        ctx.fill();
        ctx.fillStyle = "#e0f7ff";
        ctx.font = "bold 10px Outfit, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Vx = ${Math.abs(vx).toFixed(1)} m/s  (horizontal)`, panelX + 10, panelY + 53);

        // --- Vy ---
        const vyRatio = Math.min(1, Math.abs(vy) / Math.max(1, Math.abs(v0y)));
        const vyColor = vy >= 0 ? "#06d6a0" : "#ef476f";
        const vyLabel = vy >= 0 ? "↑ subindo" : "↓ descendo";
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        ctx.roundRect(panelX + 10, panelY + 60, barW, barH, 5);
        ctx.fill();
        ctx.fillStyle = vyColor;
        ctx.beginPath();
        ctx.roundRect(panelX + 10, panelY + 60, barW * vyRatio, barH, 5);
        ctx.fill();
        ctx.fillStyle = "#e0ffe8";
        ctx.font = "bold 10px Outfit, sans-serif";
        ctx.fillText(`Vy = ${vy.toFixed(1)} m/s  (${vyLabel})`, panelX + 10, panelY + 85);

        // --- Velocidade resultante ---
        const vTotal = Math.sqrt(vx * vx + vy * vy);
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 8, panelY + 90);
        ctx.lineTo(panelX + panelW - 8, panelY + 90);
        ctx.stroke();
        ctx.fillStyle = "#ffd166";
        ctx.font = "bold 10px Outfit, sans-serif";
        ctx.fillText(`|V| = √(Vx² + Vy²) = ${vTotal.toFixed(1)} m/s`, panelX + 10, panelY + 106);

        ctx.restore();
    },

    /**
     * Desenha alvos flutuantes suspensos no ar para a Fase 5 (Análise de Vetores).
     * @param {Array} targets - Array de { x, y, width, height, isHit }
     */
    drawFloatingTargets(targets) {
        const ctx = this.ctx;
        if (!targets || targets.length === 0) return;

        targets.forEach(target => {
            const screenPos = this.physToCanvas(target.x, target.y);
            const w = target.width * this.pixelsPerMeter;
            const h = target.height * this.pixelsPerMeter;

            ctx.save();

            if (target.isHit) {
                // Alvo já atingido: verde com checkmark
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = "#06d6a0";
                ctx.beginPath();
                ctx.roundRect(screenPos.x - w / 2, screenPos.y - h, w, h, 6);
                ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.fillStyle = "#06d6a0";
                ctx.font = `bold ${Math.max(16, h * 0.6)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("✅", screenPos.x, screenPos.y - h / 2);
            } else {
                // Fundo do alvo: laranja/ouro
                const grad = ctx.createLinearGradient(screenPos.x - w/2, screenPos.y - h, screenPos.x + w/2, screenPos.y);
                grad.addColorStop(0, "#ffb703");
                grad.addColorStop(1, "#fb8500");
                ctx.fillStyle = grad;
                ctx.shadowBlur = 12;
                ctx.shadowColor = "rgba(255, 183, 3, 0.6)";
                ctx.beginPath();
                ctx.roundRect(screenPos.x - w / 2, screenPos.y - h, w, h, 6);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Borda
                ctx.strokeStyle = "#f4a261";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Ícone central e label de altura
                ctx.fillStyle = "#003049";
                ctx.font = `bold ${Math.max(12, h * 0.5)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("🎯", screenPos.x, screenPos.y - h / 2);

                // Label com a altura do alvo em metros
                ctx.fillStyle = "rgba(255,255,255,0.9)";
                ctx.font = "bold 10px Outfit, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillText(`${target.y.toFixed(1)}m`, screenPos.x, screenPos.y - h - 16);

                // Linha pontilhada do solo ao alvo
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = "rgba(255, 183, 3, 0.35)";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                const groundY = this.canvas.height - this.groundYOffset;
                ctx.moveTo(screenPos.x, groundY);
                ctx.lineTo(screenPos.x, screenPos.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            ctx.restore();
        });
    },

    /**
     * Função utilitária para desenhar uma seta no Canvas.
     */
    drawArrow(fromx, fromy, tox, toy, color, width) {
        const ctx = this.ctx;
        const headlen = 8; // Comprimento da ponta da seta
        const angle = Math.atan2(toy - fromy, tox - fromx);

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width;

        // Desenhar linha principal
        ctx.beginPath();
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();

        // Desenhar cabeça da seta
        ctx.beginPath();
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
};

if (typeof module !== 'undefined') {
    module.exports = Renderer;
}
