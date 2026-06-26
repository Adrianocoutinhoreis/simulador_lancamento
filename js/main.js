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
        { level: 4, planet: "jupiter", targetX: 25, desc: "Fase 4: Júpiter 🪐. Gravidade gigantesca! Atire com muita força." },
        { level: 5, planet: "terra", targetX: 40, desc: "Fase 5: Análise de Vetores 🔬. Observe Vx e Vy em tempo real e acerte os alvos flutuantes!", mode: "vetores" }
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
    floatingTargets: [],        // Alvos flutuantes da Fase 5
    vectorQuizAsked: false,     // Controla se o quiz já foi exibido após o lançamento
    lastLaunchVx: 0,            // Armazena Vx inicial do lançamento para o quiz
    lastLaunchVy: 0,            // Armazena Vy inicial do lançamento para o quiz
    lastLaunchAngle: 0,         // Armazena ângulo do lançamento para o quiz
    isPaused: false,            // Controle de pausa

    // Resultados
    flightStats: null,
    trajectoryPoints: [],
    activeTrajectory: [],  // Pontos reais percorridos pelo projétil (Euler)
    projectileX: 0,
    projectileY: 0,
    projectileVx: 0,
    projectileVy: 0,
    bounceCount: 0,        // Contador de quiques
    simulationStopped: false, // Projétil parou completamente
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
        this.floatingTargets = [];
        
        if (levelNum <= this.levels.length) {
            const cfg = this.levels[levelNum - 1];
            this.currentGravity = CONFIG.PLANETS[cfg.planet].gravity;
            Renderer.setPlanet(cfg.planet);
            this.targetX = cfg.targetX;

            if (cfg.mode === "vetores") {
                // Fase 5: Modo Vetores
                this.initFloatingTargets();
                // Forçar exibição dos vetores na fase 5
                UI.showVectorsCheck.checked = true;
                UI.showVectors = true;
                UI.showVectorsCheck.disabled = true;
                UI.showVectorsCheck.parentElement.title = "Vetores obrigatórios na Fase de Análise!";
                this.maxShots = 5;
            } else {
                // Outras fases: reabilitar o toggle de vetores
                UI.showVectorsCheck.disabled = false;
                UI.showVectorsCheck.parentElement.title = "";
                this.initCrates();
            }

            UI.updateLevelHUD(cfg.level, CONFIG.PLANETS[cfg.planet].name, cfg.desc);
        } else {
            // Modo Infinito (Fase 6+) - Gravidades e distâncias aleatórias geradas pela "IA"
            // Reabilitar toggle de vetores ao entrar no modo infinito
            UI.showVectorsCheck.disabled = false;
            UI.showVectorsCheck.parentElement.title = "";

            const planetKeys = Object.keys(CONFIG.PLANETS);
            const planet = planetKeys[Math.floor(Math.random() * planetKeys.length)];
            
            this.currentGravity = CONFIG.PLANETS[planet].gravity;
            Renderer.setPlanet(planet);

            // Calcular o alcance máximo fisicamente possível com Velocidade Máx = 35m/s
            // R = v^2 / g
            const maxPossibleDistance = Math.floor((35 * 35) / this.currentGravity);
            
            // Limitar o alvo máximo (não ultrapassando 85m e deixando uma folga de 3m)
            const maxTarget = Math.min(85, maxPossibleDistance - 3);
            
            // Gerar alvo aleatório entre 20m e maxTarget
            const targetX = Math.floor(Math.random() * (maxTarget - 20 + 1)) + 20; 
            
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

        // Reabilitar vetores toggle ao sair da fase 5
        if (this.currentLevel !== 5) {
            UI.showVectorsCheck.disabled = false;
        }

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
        this.toggleControls(false);
    },

    /**
     * Cria um objeto caixa com propriedades de física.
     */
    makeCrate(x, y, width, height, type) {
        return { x, y, width, height, type, isBroken: false, vy: 0, isFalling: false };
    },

    initCrates() {
        const tx = this.targetX;
        if (this.currentLevel === 1) {
            // Fase 1: Terra 🌍 - Desafio simples (5 blocos)
            this.crates = [
                this.makeCrate(tx - 2.0, 0, 1.2, 4.5, 'column'),
                this.makeCrate(tx + 2.0, 0, 1.2, 4.5, 'column'),
                this.makeCrate(tx, 4.5, 6.0, 1.2, 'beam'),
                this.makeCrate(tx, 5.7, 2.2, 2.2, 'crate'),
                this.makeCrate(tx, 7.9, 2.2, 2.2, 'triangle')
            ];
            this.maxShots = 3;
        } else if (this.currentLevel === 2) {
            // Fase 2: Lua 🌕 - Desafio médio (7 blocos)
            this.crates = [
                this.makeCrate(tx - 3.5, 0, 1.2, 4.0, 'column'),
                this.makeCrate(tx, 0, 1.2, 4.0, 'column'),
                this.makeCrate(tx + 3.5, 0, 1.2, 4.0, 'column'),
                this.makeCrate(tx, 4.0, 9.0, 1.2, 'beam'),
                this.makeCrate(tx - 2.0, 5.2, 2.2, 2.2, 'crate'),
                this.makeCrate(tx + 2.0, 5.2, 2.2, 2.2, 'crate'),
                this.makeCrate(tx, 5.2, 2.2, 2.2, 'triangle')
            ];
            this.maxShots = 3;
        } else if (this.currentLevel === 3) {
            // Fase 3: Marte 🔴 - Desafio em dois andares
            this.crates = [
                this.makeCrate(tx, 0, 8.0, 1.2, 'beam'),
                this.makeCrate(tx - 2.5, 1.2, 1.2, 4.0, 'column'),
                this.makeCrate(tx + 2.5, 1.2, 1.2, 4.0, 'column'),
                this.makeCrate(tx, 1.2, 2.2, 2.2, 'crate'),
                this.makeCrate(tx, 5.2, 8.0, 1.2, 'beam'),
                this.makeCrate(tx - 2.0, 6.4, 1.2, 4.0, 'column'),
                this.makeCrate(tx + 2.0, 6.4, 1.2, 4.0, 'column'),
                this.makeCrate(tx, 6.4, 2.2, 2.2, 'crate'),
                this.makeCrate(tx, 10.4, 6.0, 1.2, 'beam'),
                this.makeCrate(tx - 1.5, 11.6, 2.2, 2.2, 'triangle'),
                this.makeCrate(tx + 1.5, 11.6, 2.2, 2.2, 'triangle')
            ];
            this.maxShots = 4;
        } else if (this.currentLevel === 4) {
            // Fase 4: Júpiter 🪐 - Castelo Forte
            this.crates = [
                this.makeCrate(tx - 2.5, 0, 2.2, 2.2, 'crate'),
                this.makeCrate(tx, 0, 2.2, 2.2, 'crate'),
                this.makeCrate(tx + 2.5, 0, 2.2, 2.2, 'crate'),
                this.makeCrate(tx - 2.0, 2.2, 1.2, 4.0, 'column'),
                this.makeCrate(tx + 2.0, 2.2, 1.2, 4.0, 'column'),
                this.makeCrate(tx, 6.2, 7.0, 1.2, 'beam'),
                this.makeCrate(tx - 2.0, 7.4, 2.0, 2.0, 'triangle'),
                this.makeCrate(tx, 7.4, 2.0, 2.0, 'triangle'),
                this.makeCrate(tx + 2.0, 7.4, 2.0, 2.0, 'triangle')
            ];
            this.maxShots = 4;
        } else {
            // Modo Infinito - Estrutura aleatória gerada pela IA
            const randType = Math.floor(Math.random() * 4);
            if (randType === 0) {
                this.crates = [
                    this.makeCrate(tx - 2.0, 0, 1.2, 4.5, 'column'),
                    this.makeCrate(tx + 2.0, 0, 1.2, 4.5, 'column'),
                    this.makeCrate(tx, 4.5, 6.0, 1.2, 'beam'),
                    this.makeCrate(tx, 5.7, 2.2, 2.2, 'crate')
                ];
            } else if (randType === 1) {
                this.crates = [
                    this.makeCrate(tx - 3.0, 0, 1.2, 3.5, 'column'),
                    this.makeCrate(tx + 3.0, 0, 1.2, 3.5, 'column'),
                    this.makeCrate(tx, 3.5, 8.0, 1.2, 'beam'),
                    this.makeCrate(tx - 1.5, 4.7, 2.2, 2.2, 'triangle'),
                    this.makeCrate(tx + 1.5, 4.7, 2.2, 2.2, 'triangle')
                ];
            } else if (randType === 2) {
                this.crates = [
                    this.makeCrate(tx - 2.0, 0, 2.2, 2.2, 'crate'),
                    this.makeCrate(tx + 2.0, 0, 2.2, 2.2, 'crate'),
                    this.makeCrate(tx, 2.2, 2.2, 2.2, 'crate'),
                    this.makeCrate(tx, 4.4, 2.2, 2.2, 'triangle')
                ];
            } else {
                this.crates = [
                    this.makeCrate(tx - 2.5, 0, 1.2, 4.0, 'column'),
                    this.makeCrate(tx - 2.5, 4.0, 2.0, 2.0, 'triangle'),
                    this.makeCrate(tx + 2.5, 0, 1.2, 4.0, 'column'),
                    this.makeCrate(tx + 2.5, 4.0, 2.0, 2.0, 'triangle')
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
     * Inicializa os alvos flutuantes para a Fase 5 (Análise de Vetores).
     * Cada alvo é um objeto com posição física X, Y e dimensões em metros.
     */
    initFloatingTargets() {
        const tx = this.targetX;
        // Três alvos em alturas diferentes para o aluno analisar Vy
        this.floatingTargets = [
            { x: tx - 8, y: 4.0,  width: 2.5, height: 2.5, isHit: false }, // Baixo
            { x: tx,     y: 8.0,  width: 2.5, height: 2.5, isHit: false }, // Médio (mais alto)
            { x: tx + 8, y: 5.5,  width: 2.5, height: 2.5, isHit: false }, // Intermediário
        ];
        this.shotsLeft = this.maxShots;
        if (typeof UI !== 'undefined' && UI.updateShotsHUD) {
            UI.updateShotsHUD(this.shotsLeft, this.maxShots);
        }

        const bubble = document.querySelector(".tip-bubble");
        if (bubble) {
            const tip = CONFIG.VECTOR_TIPS[Math.floor(Math.random() * CONFIG.VECTOR_TIPS.length)];
            bubble.innerHTML = `🔌 <b>Fase de Vetores!</b> Acerte os 3 alvos flutuantes! <br>💡 ${tip}`;
        }
    },

    /**
     * Verifica colisão do projétil com os alvos flutuantes (Fase 5).
     */
    checkFloatingTargetHit() {
        const radiusPhys = (CONFIG.PROJECTILES[UI.selectedProjectile].radius) / Renderer.pixelsPerMeter;

        this.floatingTargets.forEach(target => {
            if (target.isHit) return;

            const left   = target.x - target.width / 2;
            const right  = target.x + target.width / 2;
            const bottom = target.y;
            const top    = target.y + target.height;

            const projLeft   = this.projectileX - radiusPhys;
            const projRight  = this.projectileX + radiusPhys;
            const projBottom = this.projectileY - radiusPhys;
            const projTop    = this.projectileY + radiusPhys;

            if (projRight >= left && projLeft <= right && projTop >= bottom && projBottom <= top) {
                target.isHit = true;
                Renderer.createWoodSplinters(target.x, target.y + target.height / 2);
                Renderer.createCelebrationConfetti(target.x);
                UI.playSynthSound("success");
                UI.addScore(15);
                this.shakeTime = 8;
                this.shakeIntensity = 8;

                const bubble = document.querySelector(".tip-bubble");
                if (bubble) {
                    bubble.innerHTML = `🎉 <b>Alvo atingido!</b> +15 pontos! Observe os valores de Vx e Vy nesse instante!`;
                }
            }
        });
    },

    /**
     * Exibe o quiz interativo de vetores após um lançamento na Fase 5.
     * As perguntas são geradas dinamicamente com base nos dados reais do lançamento.
     * @param {string} context - Contexto do momento do quiz.
     */
    showVectorQuiz(context) {
        const modal = document.getElementById("vector-quiz-modal");
        if (!modal) return;

        // Liberar controles para próximo lançamento
        this.toggleControls(false);

        const allQ = CONFIG.VECTOR_QUIZ_QUESTIONS;

        // Filtrar perguntas relevantes ao contexto ou pegar aleatórias
        let pool = allQ.filter(q => q.context === context);
        if (pool.length === 0) pool = allQ;
        
        // Escolher pergunta aleatória do pool
        const question = pool[Math.floor(Math.random() * pool.length)];

        // Preencher dados dinâmicos no modal
        const vxVal   = Math.abs(this.lastLaunchVx).toFixed(1);
        const vyVal   = this.lastLaunchVy.toFixed(1);
        const speedVal = this.currentSpeed.toFixed(1);
        const angleVal = this.currentAngle;

        document.getElementById("quiz-question-text").innerHTML = question.question;
        document.getElementById("quiz-vx-value").textContent    = vxVal;
        document.getElementById("quiz-vy-value").textContent    = vyVal;
        document.getElementById("quiz-angle-value").textContent = angleVal + "°";
        document.getElementById("quiz-speed-value").textContent = speedVal + " m/s";

        // Renderizar as opções de resposta
        const optContainer = document.getElementById("quiz-options");
        optContainer.innerHTML = "";
        question.options.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.className = "quiz-option-btn";
            btn.id = `quiz-opt-${i}`;
            btn.textContent = opt;
            btn.addEventListener("click", () => {
                // Desabilitar todos os botões após resposta
                optContainer.querySelectorAll(".quiz-option-btn").forEach(b => b.disabled = true);

                const feedback    = document.getElementById("quiz-feedback");
                const continueBtn = document.getElementById("quiz-continue-btn");

                if (i === question.correct) {
                    btn.classList.add("correct");
                    feedback.textContent  = question.explanation;
                    feedback.className    = "quiz-feedback correct";
                    UI.addScore(10);
                    UI.playSynthSound("success");
                } else {
                    btn.classList.add("wrong");
                    optContainer.querySelectorAll(".quiz-option-btn")[question.correct].classList.add("correct");
                    feedback.textContent = question.explanation;
                    feedback.className   = "quiz-feedback wrong";
                    UI.playSynthSound("impact");
                }

                feedback.classList.remove("hidden");
                continueBtn.classList.remove("hidden");
            });
            optContainer.appendChild(btn);
        });

        // Esconder feedback e botão até resposta
        document.getElementById("quiz-feedback").classList.add("hidden");
        document.getElementById("quiz-continue-btn").classList.add("hidden");

        // Botão de continuar — clonar para remover listeners antigos
        const continueBtn = document.getElementById("quiz-continue-btn");
        const freshContinue = continueBtn.cloneNode(true);
        continueBtn.parentNode.replaceChild(freshContinue, continueBtn);
        freshContinue.addEventListener("click", () => {
            modal.classList.add("hidden");

            // Verificar se todos os alvos foram atingidos
            const allHit = this.floatingTargets.every(t => t.isHit);
            if (allHit) {
                this.isTargetHit = true;
                this.showPhaseTransitionModal();
            } else {
                const remaining = this.floatingTargets.filter(t => !t.isHit).length;
                const bubble = document.querySelector(".tip-bubble");
                if (this.shotsLeft > 0) {
                    if (bubble) {
                        const tip = CONFIG.VECTOR_TIPS[Math.floor(Math.random() * CONFIG.VECTOR_TIPS.length)];
                        bubble.innerHTML = `🎯 <b>Restam ${remaining} alvo(s)!</b> <br>💡 ${tip}`;
                    }
                } else {
                    // Sem mais tentativas: reiniciar fase
                    if (bubble) bubble.innerHTML = `😢 <b>Arremessos acabaram!</b> Reiniciando para tentar novamente...`;
                    setTimeout(() => {
                        this.loadLevel(this.currentLevel);
                        this.toggleControls(false);
                        this.updatePreview();
                    }, 2000);
                }
            }
        });

        // Exibir o modal
        modal.classList.remove("hidden");
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
        this.simulationStopped = false;
        this.isTargetHit = false;
        this.vectorQuizAsked = false;
        this.bounceCount = 0;
        this.activeTrajectory = [];

        // Inicializar velocidades Euler do projétil
        const initVel = Physics.getInitialVelocityComponents(this.currentSpeed, this.currentAngle);
        this.projectileVx = initVel.x;
        this.projectileVy = initVel.y;
        this.projectileX = 0;
        this.projectileY = 0;

        // Guardar componentes iniciais para o quiz
        this.lastLaunchVx = initVel.x;
        this.lastLaunchVy = initVel.y;
        this.lastLaunchAngle = this.currentAngle;

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
        this.projectileVx = 0;
        this.projectileVy = 0;
        this.bounceCount = 0;
        this.simulationStopped = false;
        this.activeTrajectory = [];
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
            if (this.isSimulating || this.simulationStopped) return;

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
     * Atualiza a física de todas as caixas: verifica se cada caixa tem suporte,
     * e se não tiver, faz ela cair com gravidade.
     */
    updateCratePhysics() {
        const dt = this.timeStep;
        const g = this.currentGravity;

        this.crates.forEach(crate => {
            if (crate.isBroken) return;

            // Determinar a superfície de apoio mais alta abaixo desta caixa
            const crateLeft = crate.x - crate.width / 2;
            const crateRight = crate.x + crate.width / 2;
            const crateBottom = crate.y;

            // Chão = y=0
            let supportY = 0;
            let isSupported = (crateBottom <= 0.01); // Está no chão?

            if (!isSupported) {
                // Procurar outra caixa que sirva de suporte
                this.crates.forEach(other => {
                    if (other === crate || other.isBroken) return;
                    const otherLeft = other.x - other.width / 2;
                    const otherRight = other.x + other.width / 2;
                    const otherTop = other.y + other.height;

                    // Há sobreposição horizontal?
                    const overlapX = Math.min(crateRight, otherRight) - Math.max(crateLeft, otherLeft);
                    if (overlapX > 0.05) {
                        // O topo da outra caixa está na base desta (ou muito perto)?
                        if (Math.abs(crateBottom - otherTop) < 0.15) {
                            isSupported = true;
                            supportY = Math.max(supportY, otherTop);
                        }
                        // Se a outra caixa está abaixo e próxima (para queda)
                        if (otherTop <= crateBottom && otherTop > supportY) {
                            supportY = otherTop;
                        }
                    }
                });
            }

            if (!isSupported) {
                // Sem suporte → ativar queda
                crate.isFalling = true;
            }

            if (crate.isFalling) {
                // Aplicar gravidade
                crate.vy = (crate.vy || 0) - g * dt;
                crate.y += crate.vy * dt;

                // Verificar pouso no chão
                if (crate.y <= 0) {
                    crate.y = 0;
                    if (Math.abs(crate.vy) > 1.0) {
                        crate.vy = -crate.vy * CONFIG.CRATE_RESTITUTION;
                        // Tremor leve
                        this.shakeTime = Math.max(this.shakeTime, 4);
                        this.shakeIntensity = Math.max(this.shakeIntensity, 4);
                    } else {
                        crate.vy = 0;
                        crate.isFalling = false;
                    }
                } else {
                    // Verificar pouso em outra caixa
                    this.crates.forEach(other => {
                        if (other === crate || other.isBroken) return;
                        const otherLeft = other.x - other.width / 2;
                        const otherRight = other.x + other.width / 2;
                        const otherTop = other.y + other.height;

                        const overlapX = Math.min(crateRight, otherRight) - Math.max(crateLeft, otherLeft);
                        if (overlapX > 0.05) {
                            if (crate.y <= otherTop && crate.y + crate.height > otherTop && crate.vy < 0) {
                                crate.y = otherTop;
                                if (Math.abs(crate.vy) > 1.0) {
                                    crate.vy = -crate.vy * CONFIG.CRATE_RESTITUTION;
                                } else {
                                    crate.vy = 0;
                                    crate.isFalling = false;
                                }
                            }
                        }
                    });
                }
            }
        });
    },

    /**
     * Lida com a parada final do projétil (após todos os bounces).
     */
    handleLanding() {
        this.isSimulating = false;
        this.simulationStopped = true;

        // Partículas e tremor de tela finais (apenas se não for bounce suave)
        Renderer.createImpactParticles(this.projectileX, Math.max(0, this.projectileY));
        this.shakeTime = 12;
        this.shakeIntensity = 8;

        // Som de impacto no chão
        UI.playSynthSound("impact");

        // --- Fase 5: Modo Vetores ---
        const cfg = this.levels[this.currentLevel - 1];
        if (cfg && cfg.mode === "vetores") {
            let context = "meio_do_voo";
            const halfTime = this.flightStats.flightTime / 2;
            if (Math.abs(this.currentTime - halfTime) < halfTime * 0.1) context = "ponto_mais_alto";
            else if (this.currentTime < halfTime * 0.6) context = "subindo";
            else context = "descendo";

            setTimeout(() => {
                this.showVectorQuiz(context);
            }, 800);
            return;
        }

        // Se houver caixas desmoronando, esperar 600ms. Se não, resetar/verificar quase imediatamente (50ms)
        const isCollapsing = this.crates.some(c => c.isFalling && !c.isBroken);
        const waitTime = isCollapsing ? 600 : 50;

        setTimeout(() => {
            this.checkVictory();

            if (this.isTargetHit) {
                setTimeout(() => {
                    this.toggleControls(false);
                }, 1200);
            } else {
                if (this.shotsLeft > 0) {
                    const bubble = document.querySelector(".tip-bubble");
                    if (bubble) {
                        bubble.innerHTML = `🎯 <b>Restam blocos!</b> Você ainda tem <b>${this.shotsLeft}</b> arremesso(s) restante(s). Ajuste a mira!`;
                    }
                    // Limpar automaticamente a simulação (volta para o canhão) e o rastro fantasma instantaneamente
                    this.toggleControls(false);
                    this.previousTrajectoryPoints = [];
                    this.resetSimulationState();
                    this.updatePreview();
                } else {
                    const bubble = document.querySelector(".tip-bubble");
                    if (bubble) {
                        bubble.innerHTML = `😢 <b>Que pena!</b> Seus arremessos acabaram. Reiniciando a fase para tentar novamente... 🔄`;
                        bubble.classList.add("pulse-animation");
                    }
                    
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
                    }, 100);
                }
            }
        }, waitTime);
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
            const isCurrVetores = (this.levels[this.currentLevel - 1]?.mode === "vetores");
            if (subtitle) subtitle.textContent = isCurrVetores
                ? `Incrível! Você atingiu todos os alvos flutuantes!`
                : `Incrível! Você destruiu todas as caixas!`;
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

        // --- Fase 5: Alvos flutuantes --- ou Fase normal: alvo + caixas
        const currentCfg = this.levels[this.currentLevel - 1];
        if (currentCfg && currentCfg.mode === "vetores") {
            Renderer.drawFloatingTargets(this.floatingTargets);
        } else {
            // Alvo e caixas das fases normais
            Renderer.drawTarget(this.targetX, this.isTargetHit);
            Renderer.drawCrates(this.crates);
        }

        // Trajetória prevista
        if (UI.showTrajectory && !this.isSimulating) {
            Renderer.drawTrajectoryPrediction(this.trajectoryPoints);
        }

        // Projétil
        if (this.isSimulating || this.simulationStopped) {
            // Desenhar rastro real percorrido
            if (this.activeTrajectory.length > 1) {
                Renderer.drawActiveTrajectory(this.activeTrajectory, this.activeTrajectory.length);
            }

            const velAngle = Math.atan2(this.projectileVy, this.projectileVx);

            Renderer.drawProjectile(this.projectileX, this.projectileY, this.isSimulating ? velAngle : 0);

            if (UI.showVectors && this.isSimulating) {
                Renderer.drawVectors(this.projectileX, this.projectileY, this.projectileVx, this.projectileVy);
            }

            // Painel de vetores em tempo real (Fase 5)
            if (currentCfg && currentCfg.mode === "vetores" && this.isSimulating) {
                Renderer.drawVectorPanel(this.projectileVx, this.projectileVy, this.lastLaunchVx, this.lastLaunchVy);
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
     * Verifica colisão do projétil com uma caixa e retorna o lado de impacto.
     * Retorna null se não houver colisão.
     */
    checkProjectileCrateCollision(crate, radiusPhys) {
        const left = crate.x - crate.width / 2;
        const right = crate.x + crate.width / 2;
        const bottom = crate.y;
        const top = crate.y + crate.height;

        const projLeft = this.projectileX - radiusPhys;
        const projRight = this.projectileX + radiusPhys;
        const projBottom = this.projectileY - radiusPhys;
        const projTop = this.projectileY + radiusPhys;

        if (projRight >= left && projLeft <= right && projTop >= bottom && projBottom <= top) {
            // Determinar de qual lado veio a colisão
            const overlapLeft = projRight - left;
            const overlapRight = right - projLeft;
            const overlapBottom = projTop - bottom;
            const overlapTop = top - projBottom;

            const minOverlap = Math.min(overlapLeft, overlapRight, overlapBottom, overlapTop);

            if (minOverlap === overlapLeft) return 'left';
            if (minOverlap === overlapRight) return 'right';
            if (minOverlap === overlapBottom) return 'bottom';
            return 'top';
        }
        return null;
    },

    /**
     * Processa o bounce do projétil no chão.
     * Retorna true se o projétil deve continuar, false se deve parar.
     */
    handleGroundBounce() {
        if (this.projectileY > 0) return true; // Ainda no ar

        this.projectileY = 0;

        // Verificar se deve quicar
        if (this.bounceCount < CONFIG.MAX_BOUNCES && Math.abs(this.projectileVy) > CONFIG.BOUNCE_MIN_VY) {
            // Quicar!
            this.projectileVy = -this.projectileVy * CONFIG.BOUNCE_RESTITUTION;
            this.projectileVx *= CONFIG.BOUNCE_FRICTION;
            this.bounceCount++;

            // Partículas e tremor menor a cada bounce
            const intensity = Math.max(2, 8 - this.bounceCount * 2);
            Renderer.createImpactParticles(this.projectileX, 0);
            this.shakeTime = Math.max(2, 6 - this.bounceCount);
            this.shakeIntensity = intensity;
            UI.playSynthSound("impact");

            return true; // Continuar simulação
        } else {
            // Velocidade muito baixa ou bounces esgotados → parar
            this.projectileVy = 0;
            this.projectileVx = 0;
            return false; // Parar
        }
    },

    gameLoop() {
        const dt = this.timeStep;

        if (this.isSimulating && !this.isPaused) {
            this.currentTime += dt;

            // === SIMULAÇÃO EULER STEP-BY-STEP ===
            // Aplicar gravidade à velocidade vertical
            this.projectileVy -= this.currentGravity * dt;

            // Atualizar posição
            this.projectileX += this.projectileVx * dt;
            this.projectileY += this.projectileVy * dt;

            // Guardar ponto no rastro ativo
            this.activeTrajectory.push({ x: this.projectileX, y: Math.max(0, this.projectileY) });

            const loopCfg = this.levels[this.currentLevel - 1];

            if (loopCfg && loopCfg.mode === "vetores") {
                // Fase 5: Checar colisão com alvos flutuantes
                this.checkFloatingTargetHit();

                // Bounce no chão para fase de vetores
                if (this.projectileY <= 0) {
                    if (!this.handleGroundBounce()) {
                        this.handleLanding();
                    }
                }
            } else {
                // Fases normais: Checar colisão AABB com as caixas
                const radiusPhys = (CONFIG.PROJECTILES[UI.selectedProjectile].radius) / Renderer.pixelsPerMeter;

                this.crates.forEach(crate => {
                    if (crate.isBroken) return;

                    const side = this.checkProjectileCrateCollision(crate, radiusPhys);
                    if (!side) return;

                    // Calcular velocidade de impacto
                    const impactSpeed = Math.sqrt(this.projectileVx * this.projectileVx + this.projectileVy * this.projectileVy);

                    if (impactSpeed >= CONFIG.CRATE_BREAK_SPEED) {
                        // Destruir a caixa
                        crate.isBroken = true;

                        Renderer.createWoodSplinters(crate.x, crate.y + crate.height / 2);
                        UI.playSynthSound("woodBreak");
                        this.shakeTime = 10;
                        this.shakeIntensity = 10;
                        UI.addScore(5);

                        const bubble = document.querySelector(".tip-bubble");
                        if (bubble) {
                            bubble.innerHTML = `💥 <b>CRAASH!</b> Caixa de madeira destruída! +5 pontos! 🪵`;
                        }

                        // Reduzir velocidade do projétil ao destruir (absorção de energia)
                        this.projectileVx *= 0.7;
                        this.projectileVy *= 0.7;

                        this.checkVictory();
                    } else {
                        // Velocidade insuficiente para destruir → bounce na caixa
                        if (side === 'left' || side === 'right') {
                            this.projectileVx = -this.projectileVx * CONFIG.BOUNCE_RESTITUTION;
                        } else {
                            this.projectileVy = -this.projectileVy * CONFIG.BOUNCE_RESTITUTION;
                        }
                        this.bounceCount++;

                        // Empurrar projétil para fora da caixa
                        const pushDist = radiusPhys + 0.1;
                        if (side === 'left') this.projectileX = (crate.x - crate.width / 2) - pushDist;
                        else if (side === 'right') this.projectileX = (crate.x + crate.width / 2) + pushDist;
                        else if (side === 'bottom') this.projectileY = crate.y - pushDist;
                        else if (side === 'top') this.projectileY = (crate.y + crate.height) + pushDist;

                        UI.playSynthSound("impact");
                        this.shakeTime = 4;
                        this.shakeIntensity = 4;
                    }
                });

                // Atualizar física das caixas (colapso gravitacional)
                this.updateCratePhysics();

                // Bounce no chão
                if (this.projectileY <= 0) {
                    if (!this.handleGroundBounce()) {
                        this.handleLanding();
                    }
                }

                // Segurança: parar imediatamente se o projétil saiu da tela (direita ou esquerda)
                const canvasX = Renderer.launchX + (this.projectileX * Renderer.pixelsPerMeter);
                if (canvasX > Renderer.canvas.width + 50 || canvasX < -100) {
                    this.projectileVx = 0;
                    this.projectileVy = 0;
                    this.bounceCount = CONFIG.MAX_BOUNCES;
                    this.handleLanding();
                }
            }
        }

        // Atualizar caixas mesmo quando não simulando (para completar colapso)
        if (!this.isSimulating && this.crates.some(c => c.isFalling && !c.isBroken)) {
            this.updateCratePhysics();
        }

        this.drawScene();
        requestAnimationFrame(() => this.gameLoop());
    }
};

// Inicialização
window.addEventListener("DOMContentLoaded", () => {
    MainApp.init();
});
