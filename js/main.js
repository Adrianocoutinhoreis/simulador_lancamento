// COORDENADOR PRINCIPAL (MAIN ENGINE)
// Este arquivo gerencia o loop de animação, a execução física passo a passo e a progressão de fases.

const MainApp = {
    // Parâmetros da simulação ativa
    isSimulating: false,
    currentTime: 0,
    timeStep: 0.02, // Avanço do tempo físico por frame (dt)

    // Configurações das Fases (Níveis do Jogo)
    levels: [
        { level: 1, planet: "terra", targetX: 35, desc: "Fase 1: Terra 🌍. Gravidade normal! Acerte os alvos de madeira." },
        { level: 2, planet: "lua", targetX: 75, desc: "Fase 2: Lua 🌕. Gravidade super fraca! Veja como o projétil flutua." },
        { level: 3, planet: "marte", targetX: 55, desc: "Fase 3: Marte 🔴. Solo vermelho e gravidade média. Mira calibrada pela IA!" },
        { level: 4, planet: "jupiter", targetX: 25, desc: "Fase 4: Júpiter 🪐. Gravidade gigantesca! Atire com muita força." }
    ],
    currentLevel: 1,

    // Estados físicos atuais
    currentAngle: 45,
    currentSpeed: 15,
    currentGravity: 9.81,
    targetX: 35, // Posição do alvo em metros (gerido automaticamente)
    shotsLeft: 3,
    maxShots: 3,

    // Estados de tremor de tela (Screen Shake)
    shakeTime: 0,
    shakeIntensity: 0,

    // Estados do arraste (Sling-shot / Drag to Aim)
    isDragging: false,
    dragX: 0,
    dragY: 0,

    // Objetos e histórico extras
    crates: [],
    previousTrajectoryPoints: [],

    // Resultados
    flightStats: null,
    trajectoryPoints: [],
    projectileX: 0,
    projectileY: 0,
    projectileVx: 0,
    projectileVy: 0,
    isTargetHit: false,

    /**
     * Inicialização da aplicação.
     */
    init() {
        // Inicializar os submódulos
        UI.init();
        
        const canvas = document.getElementById("sim-canvas");
        Renderer.init(canvas);

        // Iniciar na Fase 1
        this.currentLevel = 1;
        this.loadLevel(1);
        
        // Criar eventos de arrastar (Sling-shot)
        this.setupDragEvents();

        // Evento de redimensionamento da janela
        window.addEventListener("resize", () => {
            Renderer.resize();
            this.updatePreview();
        });

        // Configuração inicial do cenário
        this.updatePreview();

        // Iniciar loop de renderização geral
        this.gameLoop();
    },

    /**
     * Carrega as configurações de uma fase específica.
     * @param {number} levelNum 
     */
    loadLevel(levelNum) {
        this.isTargetHit = false;
        UI.showNextLevelButton(false);
        this.resetSimulationState();
        
        if (levelNum <= this.levels.length) {
            const cfg = this.levels[levelNum - 1];
            this.currentGravity = CONFIG.PLANETS[cfg.planet].gravity;
            Renderer.setPlanet(cfg.planet);
            this.targetX = cfg.targetX;
            this.initCrates();
            UI.updateLevelHUD(cfg.level, CONFIG.PLANETS[cfg.planet].name, cfg.desc);
        } else {
            // Modo Infinito (Fase 5+) - Gravidades e distâncias aleatórias geradas pela "IA"
            const planetKeys = Object.keys(CONFIG.PLANETS);
            const planet = planetKeys[Math.floor(Math.random() * planetKeys.length)];
            const targetX = Math.floor(Math.random() * 65) + 20; // Entre 20 e 85 metros
            
            this.currentGravity = CONFIG.PLANETS[planet].gravity;
            Renderer.setPlanet(planet);
            this.targetX = targetX;
            this.initCrates();
            UI.updateLevelHUD(
                levelNum, 
                `Infinito (${CONFIG.PLANETS[planet].name}) 🌌`, 
                `Desafio aleatório da IA! Acerte o alvo a ${targetX} metros!`
            );
        }
    },

    /**
     * Avança para a próxima fase.
     */
    nextLevel() {
        this.currentLevel++;
        this.loadLevel(this.currentLevel);

        // Feedback da nuvem do mascote
        const bubble = document.querySelector(".tip-bubble");
        if (bubble) {
            if (this.currentLevel <= this.levels.length) {
                const cfg = this.levels[this.currentLevel - 1];
                const planetName = CONFIG.PLANETS[cfg.planet].name;
                bubble.innerHTML = `🚀 <b>Viagem Espacial!</b> Chegamos na <b>Fase ${this.currentLevel}</b> no planeta <b>${planetName}</b>! Tente derrubar as caixas!`;
            } else {
                bubble.innerHTML = `🤖 <b>Modo Infinito ativado!</b> Distâncias e planetas aleatórios gerados pela Inteligência Artificial. Vamos pontuar!`;
            }
        }

        this.updatePreview();
    },

    initCrates() {
        const tx = this.targetX;
        if (this.currentLevel === 1) {
            // Fase 1: Terra 🌍 - Desafio simples (5 blocos)
            this.crates = [
                { x: tx - 2.0, y: 0, width: 1.2, height: 4.5, type: 'column', isBroken: false },
                { x: tx + 2.0, y: 0, width: 1.2, height: 4.5, type: 'column', isBroken: false },
                { x: tx, y: 4.5, width: 6.0, height: 1.2, type: 'beam', isBroken: false },
                { x: tx, y: 5.7, width: 2.2, height: 2.2, type: 'crate', isBroken: false },
                { x: tx, y: 7.9, width: 2.2, height: 2.2, type: 'triangle', isBroken: false }
            ];
            this.maxShots = 3;
        } else if (this.currentLevel === 2) {
            // Fase 2: Lua 🌕 - Desafio médio (7 blocos)
            this.crates = [
                { x: tx - 3.5, y: 0, width: 1.2, height: 4.0, type: 'column', isBroken: false },
                { x: tx, y: 0, width: 1.2, height: 4.0, type: 'column', isBroken: false },
                { x: tx + 3.5, y: 0, width: 1.2, height: 4.0, type: 'column', isBroken: false },
                { x: tx, y: 4.0, width: 9.0, height: 1.2, type: 'beam', isBroken: false },
                { x: tx - 2.0, y: 5.2, width: 2.2, height: 2.2, type: 'crate', isBroken: false },
                { x: tx + 2.0, y: 5.2, width: 2.2, height: 2.2, type: 'crate', isBroken: false },
                { x: tx, y: 5.2, width: 2.2, height: 2.2, type: 'triangle', isBroken: false }
            ];
            this.maxShots = 3;
        } else if (this.currentLevel === 3) {
            // Fase 3: Marte 🔴 - Desafio em dois andares (Angry Birds Reference)
            this.crates = [
                // Base
                { x: tx, y: 0, width: 8.0, height: 1.2, type: 'beam', isBroken: false },
                // Primeiro andar
                { x: tx - 2.5, y: 1.2, width: 1.2, height: 4.0, type: 'column', isBroken: false },
                { x: tx + 2.5, y: 1.2, width: 1.2, height: 4.0, type: 'column', isBroken: false },
                { x: tx, y: 1.2, width: 2.2, height: 2.2, type: 'crate', isBroken: false },
                // Teto do primeiro andar
                { x: tx, y: 5.2, width: 8.0, height: 1.2, type: 'beam', isBroken: false },
                // Segundo andar
                { x: tx - 2.0, y: 6.4, width: 1.2, height: 4.0, type: 'column', isBroken: false },
                { x: tx + 2.0, y: 6.4, width: 1.2, height: 4.0, type: 'column', isBroken: false },
                { x: tx, y: 6.4, width: 2.2, height: 2.2, type: 'crate', isBroken: false },
                // Teto do segundo andar
                { x: tx, y: 10.4, width: 6.0, height: 1.2, type: 'beam', isBroken: false },
                // Telhado
                { x: tx - 1.5, y: 11.6, width: 2.2, height: 2.2, type: 'triangle', isBroken: false },
                { x: tx + 1.5, y: 11.6, width: 2.2, height: 2.2, type: 'triangle', isBroken: false }
            ];
            this.maxShots = 4;
        } else if (this.currentLevel === 4) {
            // Fase 4: Júpiter 🪐 - Castelo Forte (9 blocos)
            this.crates = [
                { x: tx - 2.5, y: 0, width: 2.2, height: 2.2, type: 'crate', isBroken: false },
                { x: tx, y: 0, width: 2.2, height: 2.2, type: 'crate', isBroken: false },
                { x: tx + 2.5, y: 0, width: 2.2, height: 2.2, type: 'crate', isBroken: false },
                { x: tx - 2.0, y: 2.2, width: 1.2, height: 4.0, type: 'column', isBroken: false },
                { x: tx + 2.0, y: 2.2, width: 1.2, height: 4.0, type: 'column', isBroken: false },
                { x: tx, y: 6.2, width: 7.0, height: 1.2, type: 'beam', isBroken: false },
                { x: tx - 2.0, y: 7.4, width: 2.0, height: 2.0, type: 'triangle', isBroken: false },
                { x: tx, y: 7.4, width: 2.0, height: 2.0, type: 'triangle', isBroken: false },
                { x: tx + 2.0, y: 7.4, width: 2.0, height: 2.0, type: 'triangle', isBroken: false }
            ];
            this.maxShots = 4;
        } else {
            // Modo Infinito (Fase 5+) - Estrutura aleatória gerada pela IA
            const randType = Math.floor(Math.random() * 4);
            if (randType === 0) {
                // Tipo 1: Torre Simples
                this.crates = [
                    { x: tx - 2.0, y: 0, width: 1.2, height: 4.5, type: 'column', isBroken: false },
                    { x: tx + 2.0, y: 0, width: 1.2, height: 4.5, type: 'column', isBroken: false },
                    { x: tx, y: 4.5, width: 6.0, height: 1.2, type: 'beam', isBroken: false },
                    { x: tx, y: 5.7, width: 2.2, height: 2.2, type: 'crate', isBroken: false }
                ];
            } else if (randType === 1) {
                // Tipo 2: Ponte de Madeira
                this.crates = [
                    { x: tx - 3.0, y: 0, width: 1.2, height: 3.5, type: 'column', isBroken: false },
                    { x: tx + 3.0, y: 0, width: 1.2, height: 3.5, type: 'column', isBroken: false },
                    { x: tx, y: 3.5, width: 8.0, height: 1.2, type: 'beam', isBroken: false },
                    { x: tx - 1.5, y: 4.7, width: 2.2, height: 2.2, type: 'triangle', isBroken: false },
                    { x: tx + 1.5, y: 4.7, width: 2.2, height: 2.2, type: 'triangle', isBroken: false }
                ];
            } else if (randType === 2) {
                // Tipo 3: Pilha Tripla
                this.crates = [
                    { x: tx - 2.0, y: 0, width: 2.2, height: 2.2, type: 'crate', isBroken: false },
                    { x: tx + 2.0, y: 0, width: 2.2, height: 2.2, type: 'crate', isBroken: false },
                    { x: tx, y: 2.2, width: 2.2, height: 2.2, type: 'crate', isBroken: false },
                    { x: tx, y: 4.4, width: 2.2, height: 2.2, type: 'triangle', isBroken: false }
                ];
            } else {
                // Tipo 4: Duas Torres
                this.crates = [
                    { x: tx - 2.5, y: 0, width: 1.2, height: 4.0, type: 'column', isBroken: false },
                    { x: tx - 2.5, y: 4.0, width: 2.0, height: 2.0, type: 'triangle', isBroken: false },
                    { x: tx + 2.5, y: 0, width: 1.2, height: 4.0, type: 'column', isBroken: false },
                    { x: tx + 2.5, y: 4.0, width: 2.0, height: 2.0, type: 'triangle', isBroken: false }
                ];
            }
            this.maxShots = 3;
        }

        this.shotsLeft = this.maxShots;
        if (typeof UI !== 'undefined' && UI.updateShotsHUD) {
            UI.updateShotsHUD(this.shotsLeft, this.maxShots);
        }
    },

    /**
     * Altera a gravidade conforme o planeta.
     * @param {string} planetKey 
     */
    changePlanet(planetKey) {
        Renderer.setPlanet(planetKey);
        this.currentGravity = CONFIG.PLANETS[planetKey].gravity;
        this.updatePreview();
    },

    /**
     * Altera as propriedades e visual do projétil.
     * @param {string} projKey 
     */
    changeProjectile(projKey) {
        Renderer.setProjectile(projKey);
        this.updatePreview();
    },

    /**
     * Altera a distância do alvo e recria caixas no novo local (para modo livre ou debug).
     * @param {number} newX 
     */
    changeTarget(newX) {
        this.targetX = newX;
        this.isTargetHit = false;
        this.initCrates();
        this.updatePreview();
    },

    /**
     * Recalcula a trajetória estática e atualiza a escala antes do disparo.
     */
    updatePreview() {
        if (this.isSimulating || !Renderer.canvas || !UI.angleSlider) return;

        this.currentAngle = parseFloat(UI.angleSlider.value);
        this.currentSpeed = parseFloat(UI.speedSlider.value);

        // Calcular estatísticas físicas reais
        this.flightStats = Physics.calculateFlightStats(
            this.currentSpeed,
            this.currentAngle,
            this.currentGravity
        );

        // Gerar pontos da linha pontilhada de previsão
        this.trajectoryPoints = Physics.generateTrajectoryPoints(
            this.currentSpeed,
            this.currentAngle,
            this.currentGravity,
            50
        );

        // Ajustar zoom do canvas para caber a trajetória predita e obstáculos
        const maxRangeNeeded = Math.max(this.flightStats.maxDistance, this.targetX + 15);
        Renderer.adjustScale(maxRangeNeeded, this.flightStats.maxHeight);

        // Atualizar HUD com valores previstos antes do lançamento
        UI.updateHUDMetrics(
            this.flightStats.flightTime,
            this.flightStats.maxHeight,
            this.flightStats.maxDistance
        );

        this.drawScene();
    },

    /**
     * Inicia o disparo físico do projétil.
     */
    launch() {
        if (this.isSimulating || this.shotsLeft <= 0) return;

        // Decrementar arremessos restantes
        this.shotsLeft--;
        if (typeof UI !== 'undefined' && UI.updateShotsHUD) {
            UI.updateShotsHUD(this.shotsLeft, this.maxShots);
        }

        // Salvar a trajetória atual como rastro histórico antes de redefinir
        if (this.projectileX > 0) {
            this.previousTrajectoryPoints = [...this.trajectoryPoints];
        }

        this.resetSimulationState();

        // Configurar parâmetros do disparo
        this.currentAngle = parseFloat(UI.angleSlider.value);
        this.currentSpeed = parseFloat(UI.speedSlider.value);
        this.currentTime = 0;
        this.isSimulating = true;
        this.isTargetHit = false;

        // Tremor de tela do disparo
        this.shakeTime = 8;
        this.shakeIntensity = 4;

        // Tocar som de disparo
        UI.playSynthSound("launch");

        // Desabilitar controles temporariamente
        this.toggleControls(true);
        UI.showNextLevelButton(false); // Ocultar botão de avançar durante o voo
    },

    reset() {
        this.isSimulating = false;
        this.previousTrajectoryPoints = [];
        this.resetSimulationState();
        this.loadLevel(this.currentLevel);
        this.toggleControls(false);
        this.updatePreview();
    },

    /**
     * Reinicia o jogo completo, voltando para a tela de seleção inicial.
     */
    restartGame() {
        this.isSimulating = false;
        this.previousTrajectoryPoints = [];
        this.resetSimulationState();
        this.currentLevel = 1;
        
        // Zerar placar
        if (typeof UI !== 'undefined') {
            UI.score = 0;
            if (UI.hudScore) UI.hudScore.textContent = "0";
            if (UI.startScreen) UI.startScreen.classList.remove("hidden");
        }

        this.loadLevel(this.currentLevel);
        this.toggleControls(false);
        this.updatePreview();
    },

    /**
     * Limpa partículas e coordenadas.
     */
    resetSimulationState() {
        Renderer.particles = [];
        this.currentTime = 0;
        this.projectileX = 0;
        this.projectileY = 0;
    },

    toggleControls(disable) {
        UI.angleSlider.disabled = disable;
        UI.speedSlider.disabled = disable;
        UI.btnLaunch.disabled = disable;
        if (UI.btnRestartGame) UI.btnRestartGame.disabled = disable;
        
        if (disable) {
            UI.btnLaunch.style.opacity = 0.5;
            if (UI.btnRestartGame) UI.btnRestartGame.style.opacity = 0.5;
        } else {
            UI.btnLaunch.style.opacity = 1.0;
            if (UI.btnRestartGame) UI.btnRestartGame.style.opacity = 1.0;
        }
    },

    /**
     * Configura os eventos de arraste na tela (Angry Birds).
     */
    setupDragEvents() {
        const canvas = Renderer.canvas;
        if (!canvas) return;

        const getMousePos = (evt) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
            const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        };

        const onStart = (evt) => {
            if (this.isSimulating) return;

            const pos = getMousePos(evt);
            const groundY = canvas.height - Renderer.groundYOffset;
            const cannonX = Renderer.launchX;
            const cannonY = groundY - 10;

            const dx = pos.x - cannonX;
            const dy = pos.y - cannonY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Permite arrastar se clicar a menos de 100px do lançador
            if (dist < 100) {
                this.isDragging = true;
                this.dragX = pos.x;
                this.dragY = pos.y;
                evt.preventDefault();
            }
        };

        const onMove = (evt) => {
            if (!this.isDragging) return;

            const pos = getMousePos(evt);
            this.dragX = pos.x;
            this.dragY = pos.y;

            const groundY = canvas.height - Renderer.groundYOffset;
            const cannonX = Renderer.launchX;
            const cannonY = groundY - 10;

            const dx = cannonX - this.dragX;
            const dy = this.dragY - cannonY; 

            // Ângulo
            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            angle = Math.max(5, Math.min(85, angle)); 

            // Força/Velocidade
            const dist = Math.sqrt(dx * dx + dy * dy);
            let speed = 5 + (dist / 130) * 30;
            speed = Math.max(5, Math.min(35, speed));

            // Atualizar valores UI
            UI.angleSlider.value = Math.round(angle);
            UI.speedSlider.value = Math.round(speed);
            UI.updateSlidersText();

            this.updatePreview();
            evt.preventDefault();
        };

        const onEnd = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.launch();
            }
        };

        // Ouvintes de Mouse
        canvas.addEventListener("mousedown", onStart);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onEnd);

        // Ouvintes Mobile
        canvas.addEventListener("touchstart", onStart, { passive: false });
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("touchend", onEnd);
    },

    /**
     * Lida com a aterrissagem do projétil no solo.
     */
    handleLanding() {
        const finalX = this.flightStats.maxDistance;
        
        this.isSimulating = false;
        this.projectileX = finalX;
        this.projectileY = 0;

        // Partículas e tremor de tela
        Renderer.createImpactParticles(finalX, 0);
        this.shakeTime = 12;
        this.shakeIntensity = 8;

        // Som de impacto no chão
        UI.playSynthSound("impact");

        // Checar vitória
        this.checkVictory();

        if (this.isTargetHit) {
            // Vitória já acionada, liberar controles para avançar
            setTimeout(() => {
                this.toggleControls(false);
            }, 1200);
        } else {
            // Se ainda restarem blocos em pé
            if (this.shotsLeft > 0) {
                const bubble = document.querySelector(".tip-bubble");
                if (bubble) {
                    bubble.innerHTML = `🎯 <b>Restam blocos!</b> Você ainda tem <b>${this.shotsLeft}</b> arremesso(s) restante(s). Ajuste a mira!`;
                }
                setTimeout(() => {
                    this.toggleControls(false);
                }, 1200);
            } else {
                // Fim das tentativas - reiniciar a fase
                const bubble = document.querySelector(".tip-bubble");
                if (bubble) {
                    bubble.innerHTML = `😢 <b>Que pena!</b> Seus arremessos acabaram. Reiniciando a fase para tentar novamente... 🔄`;
                    bubble.classList.add("pulse-animation");
                }
                
                // Tocar som de derrota (sintetizador de pitch descendente)
                if (typeof UI !== 'undefined' && UI.audioCtx) {
                    try {
                        const ctx = UI.audioCtx;
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.type = "sine";
                        osc.frequency.setValueAtTime(150, ctx.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.5);
                        gain.gain.setValueAtTime(0.3, ctx.currentTime);
                        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.5);
                    } catch(e) {}
                }

                setTimeout(() => {
                    this.loadLevel(this.currentLevel);
                    this.toggleControls(false);
                    this.updatePreview();
                }, 2200);
            }
        }
    },

    /**
     * Verifica se todas as caixas geométricas foram destruídas para vencer a fase.
     */
    checkVictory() {
        if (this.isTargetHit) return; // Já venceu esta rodada

        const allBroken = this.crates.every(c => c.isBroken);
        if (allBroken) {
            this.isTargetHit = true;
            Renderer.createCelebrationConfetti(this.targetX);
            UI.addScore(25); // Pontos de bônus por vitória total!

            const bubble = document.querySelector(".tip-bubble");
            if (bubble) {
                bubble.innerHTML = `🎉 <b>INCRÍVEL!</b> Você destruiu todas as caixas!`;
                bubble.classList.add("pulse-animation");
            }

            // Som de comemoração
            UI.playSynthSound("success");

            // Mostrar modal de feedback da próxima fase e avançar automaticamente
            this.showPhaseTransitionModal();
        }
    },

    /**
     * Exibe o modal de transição de fase com informações do próximo planeta e countdown.
     */
    showPhaseTransitionModal() {
        const modal = document.getElementById("phase-transition-modal");
        if (!modal) {
            // Fallback: avançar direto se modal não existir
            setTimeout(() => this.nextLevel(), 2000);
            return;
        }

        const trophy     = document.getElementById("phase-modal-trophy");
        const title      = document.getElementById("phase-modal-title");
        const subtitle   = document.getElementById("phase-modal-subtitle");
        const nextBox    = document.getElementById("phase-modal-next");
        const emoji      = document.getElementById("phase-modal-planet-emoji");
        const name       = document.getElementById("phase-modal-planet-name");
        const desc       = document.getElementById("phase-modal-planet-desc");
        const fact       = document.getElementById("phase-modal-fact");
        const modalCard  = modal.querySelector(".phase-modal-content");

        // Resetar classe de modo infinito
        modalCard.classList.remove("infinite-mode");

        const nextLevel = this.currentLevel + 1;

        if (this.currentLevel < this.levels.length) {
            // Há uma próxima fase normal
            const nextCfg    = this.levels[nextLevel - 1];
            const nextPlanet = CONFIG.PLANETS[nextCfg.planet];
            const planetEmoji = nextPlanet.name.split(" ")[1] || "🌍";

            if (trophy)   trophy.textContent   = "🏆";
            if (title)    title.textContent    = `Fase ${this.currentLevel} Concluída!`;
            if (subtitle) subtitle.textContent = `Incrível! Você destruiu todas as caixas!`;
            if (emoji)    emoji.textContent    = planetEmoji;
            if (name)     name.textContent     = nextPlanet.name;
            if (desc)     desc.textContent     = nextPlanet.description;
            if (fact)     fact.innerHTML       = `💡 ${nextPlanet.funFact}`;
            if (nextBox)  nextBox.style.display = "flex";

        } else if (this.currentLevel === this.levels.length) {
            // Última fase → Modo Infinito
            modalCard.classList.add("infinite-mode");
            if (trophy)   trophy.textContent   = "🌌";
            if (title)    title.textContent    = "SUPER CAMPEÃO!";
            if (subtitle) subtitle.textContent = "Você completou todas as fases planetárias!";
            if (emoji)    emoji.textContent    = "🤖";
            if (name)     name.textContent     = "Modo Infinito";
            if (desc)     desc.textContent     = "Planetas e distâncias aleatórios gerados pela IA!";
            if (fact)     fact.innerHTML       = "💡 Veja até onde você consegue chegar no Modo Infinito!";
            if (nextBox)  nextBox.style.display = "flex";

        } else {
            // Já no modo infinito
            modalCard.classList.add("infinite-mode");
            if (trophy)   trophy.textContent   = "🚀";
            if (title)    title.textContent    = "Vitória Infinita!";
            if (subtitle) subtitle.textContent = "Mais um desafio da IA derrubado!";
            if (nextBox)  nextBox.style.display = "none";
        }

        // Exibir modal
        modal.classList.remove("hidden");

        // Botão de avançar fase
        const btnNext = document.getElementById("btn-phase-next");
        if (btnNext) {
            // Clonar para remover listeners antigos
            const fresh = btnNext.cloneNode(true);
            btnNext.parentNode.replaceChild(fresh, btnNext);
            fresh.addEventListener("click", () => {
                modal.classList.add("hidden");
                this.nextLevel();
            });
        }
    },

    /**
     * Renderiza o estado do Canvas.
     */
    drawScene() {
        const ctx = Renderer.ctx;
        if (!ctx) return;

        ctx.save();
        
        // Efeito de tremor de tela (Screen Shake)
        if (this.shakeTime > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            ctx.translate(dx, dy);
            this.shakeTime--;
        }

        // Fundo
        Renderer.drawBackground();

        // Rastro anterior
        if (UI.showTrajectory && this.previousTrajectoryPoints.length > 0) {
            Renderer.drawPreviousTrajectory(this.previousTrajectoryPoints);
        }

        // Alvo
        Renderer.drawTarget(this.targetX, this.isTargetHit);

        // Caixas de madeira
        Renderer.drawCrates(this.crates);

        // Trajetória prevista
        if (UI.showTrajectory && !this.isSimulating) {
            Renderer.drawTrajectoryPrediction(this.trajectoryPoints);
        }

        // Projétil
        if (this.isSimulating) {
            const elapsedPercent = this.currentTime / this.flightStats.flightTime;
            const activeIndex = Math.floor(elapsedPercent * this.trajectoryPoints.length);
            
            Renderer.drawActiveTrajectory(this.trajectoryPoints, activeIndex);

            const vel = Physics.getVelocityAtTime(
                this.currentTime,
                this.currentSpeed,
                this.currentAngle,
                this.currentGravity
            );
            const velAngle = Math.atan2(vel.y, vel.x);

            Renderer.drawProjectile(this.projectileX, this.projectileY, velAngle);

            if (UI.showVectors) {
                Renderer.drawVectors(this.projectileX, this.projectileY, vel.x, vel.y);
            }
        } else if (this.projectileX > 0) {
            Renderer.drawProjectile(this.projectileX, this.projectileY, 0);
        }

        // Estilingue de arraste
        if (this.isDragging) {
            Renderer.drawElastic(this.dragX, this.dragY);
            
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.translate(this.dragX, this.dragY);
            const dragSprite = Renderer.emojiSprites[CONFIG.PROJECTILES[UI.selectedProjectile].emoji];
            if (dragSprite) {
                ctx.drawImage(dragSprite, -dragSprite.width / 2, -dragSprite.height / 2);
            } else {
                ctx.font = `${CONFIG.PROJECTILES[UI.selectedProjectile].radius * 2}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(CONFIG.PROJECTILES[UI.selectedProjectile].emoji, 0, 0);
            }
            ctx.restore();
        }

        // Partículas
        Renderer.drawParticles();

        // Lançador
        Renderer.drawCannon(this.currentAngle);

        // Setas na preparação
        if (UI.showVectors && !this.isSimulating) {
            const barrelLength = 40;
            const rad = Physics.degreesToRadians(this.currentAngle);
            const muzzlePhysX = (barrelLength * Math.cos(rad)) / Renderer.pixelsPerMeter;
            const muzzlePhysY = (barrelLength * Math.sin(rad)) / Renderer.pixelsPerMeter;

            const initVel = Physics.getInitialVelocityComponents(this.currentSpeed, this.currentAngle);
            Renderer.drawVectors(muzzlePhysX, muzzlePhysY, initVel.x, initVel.y);
        }

        ctx.restore();
    },

    /**
     * Loop principal de renderização e colisão.
     */
    gameLoop() {
        if (this.isSimulating) {
            this.currentTime += this.timeStep;

            // Checar colisão AABB com as caixas
            this.crates.forEach(crate => {
                if (crate.isBroken) return;

                const left = crate.x - crate.width / 2;
                const right = crate.x + crate.width / 2;
                const bottom = crate.y;
                const top = crate.y + crate.height;

                const radiusPhys = (CONFIG.PROJECTILES[UI.selectedProjectile].radius) / Renderer.pixelsPerMeter;
                
                const projLeft = this.projectileX - radiusPhys;
                const projRight = this.projectileX + radiusPhys;
                const projBottom = this.projectileY - radiusPhys;
                const projTop = this.projectileY + radiusPhys;

                if (projRight >= left && projLeft <= right && projTop >= bottom && projBottom <= top) {
                    crate.isBroken = true;

                    // Estilhaços, som e tremor
                    Renderer.createWoodSplinters(crate.x, crate.y + crate.height / 2);
                    UI.playSynthSound("woodBreak");
                    this.shakeTime = 10;
                    this.shakeIntensity = 10;

                    // Adicionar pontos extras
                    UI.addScore(5);

                    const bubble = document.querySelector(".tip-bubble");
                    if (bubble) {
                        bubble.innerHTML = `💥 <b>CRAASH!</b> Caixa de madeira destruída! +5 pontos! 🪵`;
                    }

                    // Checar se completou a fase ao quebrar o bloco
                    this.checkVictory();
                }
            });

            if (this.currentTime >= this.flightStats.flightTime) {
                this.handleLanding();
            } else {
                const pos = Physics.getPositionAtTime(
                    this.currentTime,
                    this.currentSpeed,
                    this.currentAngle,
                    this.currentGravity
                );
                this.projectileX = pos.x;
                this.projectileY = pos.y;
            }
        }

        this.drawScene();
        requestAnimationFrame(() => this.gameLoop());
    }
};

// Inicialização
window.addEventListener("DOMContentLoaded", () => {
    MainApp.init();
});
