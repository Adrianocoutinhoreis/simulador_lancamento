// GERENCIADOR DE INTERFACE (UI) DO SIMULADOR
// Este arquivo gerencia a tela inicial de personagens, pop-ups, controles deslizantes e áudio.

const UI = {
    // Referências do DOM - Controles principais
    angleSlider: null,
    angleValue: null,
    speedSlider: null,
    speedValue: null,
    showVectorsCheck: null,
    showTrajectoryCheck: null,
    
    btnLaunch: null,
    btnReset: null,
    btnRestartGame: null,
    btnNextLevel: null,
    hudShots: null,
    
    // Tela Inicial e Modal de Ajuda
    startScreen: null,
    charCards: [],
    btnHelp: null,
    helpModal: null,
    modalClose: null,

    // HUD e métricas de status
    hudLevelTitle: null,
    hudLevelDesc: null,
    hudToyEmoji: null,
    hudToyName: null,
    
    hudTime: null,
    hudHeight: null,
    hudHeightDesc: null,
    hudDistance: null,
    hudDistanceDesc: null,
    hudScore: null,
    hudTip: null,
    hudTipBubble: null,

    // Variáveis de estado da UI
    selectedPlanet: "terra",
    selectedProjectile: "tomate",
    showVectors: false,
    showTrajectory: true,
    score: 0,
    isMuted: false,
    audioCtx: null,

    /**
     * Inicializa a UI e vincula todos os eventos.
     */
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.updateSlidersText();
        this.showNewTip();
    },

    /**
     * Armazena as referências dos elementos HTML na memória.
     */
    cacheDOM() {
        // Sliders e Switches
        this.angleSlider = document.getElementById("angle-slider");
        this.angleValue = document.getElementById("angle-value");
        this.speedSlider = document.getElementById("speed-slider");
        this.speedValue = document.getElementById("speed-value");
        this.showVectorsCheck = document.getElementById("show-vectors");
        this.showTrajectoryCheck = document.getElementById("show-trajectory");
        
        this.btnLaunch = document.getElementById("btn-launch");
        this.btnReset = document.getElementById("btn-reset");
        this.btnRestartGame = document.getElementById("btn-restart-game");
        this.btnNextLevel = document.getElementById("btn-next-level");
        this.hudShots = document.getElementById("hud-shots");

        // Tela de Seleção Inicial
        this.startScreen = document.getElementById("start-screen");
        this.charCards = document.querySelectorAll(".char-card");

        // Modal de Ajuda
        this.btnHelp = document.getElementById("btn-help");
        this.helpModal = document.getElementById("help-modal");
        this.modalClose = document.getElementById("modal-close");

        // Elementos de Informação e Status
        this.hudLevelTitle = document.getElementById("hud-level-title");
        this.hudLevelDesc = document.getElementById("hud-level-desc");
        this.hudToyEmoji = document.getElementById("hud-toy-emoji");
        this.hudToyName = document.getElementById("hud-toy-name");

        // Métricas e HUD
        this.hudTime = document.getElementById("hud-time");
        this.hudHeight = document.getElementById("hud-height");
        this.hudHeightDesc = document.getElementById("hud-height-desc");
        this.hudDistance = document.getElementById("hud-distance");
        this.hudDistanceDesc = document.getElementById("hud-distance-desc");
        this.hudScore = document.getElementById("hud-score");
        
        this.hudTip = document.getElementById("hud-tip");
        this.hudTipBubble = document.querySelector(".tip-bubble");
    },

    /**
     * Vincula listeners de eventos de interação aos controles da interface.
     */
    bindEvents() {
        // Sliders
        this.angleSlider.addEventListener("input", () => {
            this.angleValue.textContent = `${this.angleSlider.value}°`;
            if (typeof MainApp !== "undefined") MainApp.updatePreview();
        });

        this.speedSlider.addEventListener("input", () => {
            this.speedValue.textContent = `${this.speedSlider.value} m/s`;
            if (typeof MainApp !== "undefined") MainApp.updatePreview();
        });

        // Switches/Toggles
        this.showVectorsCheck.addEventListener("change", (e) => {
            this.showVectors = e.target.checked;
            if (typeof MainApp !== "undefined") MainApp.drawScene();
        });

        this.showTrajectoryCheck.addEventListener("change", (e) => {
            this.showTrajectory = e.target.checked;
            if (typeof MainApp !== "undefined") MainApp.drawScene();
        });

        // Botões de Ação Principal
        this.btnLaunch.addEventListener("click", () => {
            if (typeof MainApp !== "undefined") MainApp.launch();
        });

        this.btnReset.addEventListener("click", () => {
            if (typeof MainApp !== "undefined") MainApp.reset();
            this.showNewTip();
        });

        // Botão de Reiniciar o jogo completo
        this.btnRestartGame.addEventListener("click", () => {
            if (typeof MainApp !== "undefined") MainApp.restartGame();
            this.playSynthSound("select");
        });

        // Botão de Avançar Fase (Nível)
        if (this.btnNextLevel) {
            this.btnNextLevel.addEventListener("click", () => {
                if (typeof MainApp !== "undefined") MainApp.nextLevel();
                this.playSynthSound("select");
            });
        }

        // Eventos dos cards da Tela Inicial
        this.charCards.forEach(card => {
            card.addEventListener("click", () => {
                this.selectedProjectile = card.dataset.proj;
                this.playSynthSound("select");
                
                // Oculta tela inicial e atualiza brinquedo selecionado
                this.startScreen.classList.add("hidden");
                this.updateActiveToyHUD(this.selectedProjectile);

                if (typeof MainApp !== "undefined") {
                    MainApp.changeProjectile(this.selectedProjectile);
                }
            });
        });

        // Eventos do Modal de Ajuda
        this.btnHelp.addEventListener("click", () => {
            this.helpModal.classList.remove("hidden");
            this.playSynthSound("select");
        });

        this.modalClose.addEventListener("click", () => {
            this.helpModal.classList.add("hidden");
            this.playSynthSound("select");
        });

        // Fechar ao clicar fora do conteúdo do modal
        this.helpModal.addEventListener("click", (e) => {
            if (e.target === this.helpModal) {
                this.helpModal.classList.add("hidden");
            }
        });
    },

    /**
     * Sincroniza os textos informativos com os valores atuais dos sliders.
     */
    updateSlidersText() {
        this.angleValue.textContent = `${this.angleSlider.value}°`;
        this.speedValue.textContent = `${this.speedSlider.value} m/s`;
    },

    /**
     * Alterna o silenciamento do sintetizador de áudio.
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.btnMute.textContent = this.isMuted ? "🔇 Mudo" : "🔊 Som Ligado";
        this.btnMute.classList.toggle("muted", this.isMuted);
    },

    /**
     * Atualiza o card informativo do projétil ativo.
     * @param {string} projKey 
     */
    updateActiveToyHUD(projKey) {
        const config = CONFIG.PROJECTILES[projKey];
        if (this.hudToyEmoji) this.hudToyEmoji.textContent = config.emoji;
        if (this.hudToyName) this.hudToyName.textContent = config.name;
    },

    /**
     * Atualiza as informações de fase no topo da tela.
     */
    updateLevelHUD(levelNum, planetName, planetDesc) {
        if (this.hudLevelTitle) this.hudLevelTitle.textContent = `Fase ${levelNum}: ${planetName}`;
        if (this.hudLevelDesc) this.hudLevelDesc.textContent = planetDesc;
    },

    /**
     * Exibe ou esconde o botão de avançar de fase.
     */
    showNextLevelButton(visible) {
        if (this.btnNextLevel) {
            this.btnNextLevel.classList.toggle("hidden", !visible);
        }
    },

    /**
     * Atualiza o contador de arremessos (tentativas) restantes na HUD.
     */
    updateShotsHUD(shotsLeft, maxShots) {
        if (this.hudShots) {
            this.hudShots.textContent = `${shotsLeft} / ${maxShots}`;
            
            const card = document.getElementById("hud-shots-card");
            if (card) {
                if (shotsLeft === 0) {
                    card.style.background = "#ffebee";
                    card.style.borderColor = "#f44336";
                } else if (shotsLeft === 1) {
                    card.style.background = "#fff3e0";
                    card.style.borderColor = "#ff9800";
                } else {
                    card.style.background = "#e8f5e9";
                    card.style.borderColor = "#4caf50";
                }
            }
        }
    },

    /**
     * Atualiza as métricas da HUD e gera as descrições educativas.
     * @param {number} flightTime 
     * @param {number} maxHeight 
     * @param {number} maxDistance 
     */
    updateHUDMetrics(flightTime, maxHeight, maxDistance) {
        this.hudTime.textContent = `${flightTime.toFixed(2)}s`;
        this.hudHeight.textContent = `${maxHeight.toFixed(1)}m`;
        this.hudDistance.textContent = `${maxDistance.toFixed(1)}m`;

        // Gerar as comparações lúdicas
        this.hudHeightDesc.innerHTML = `Equivale a <b>${this.getComparisonString(maxHeight, CONFIG.HEIGHT_COMPARISONS)}</b>!`;
        this.hudDistanceDesc.innerHTML = `Equivale a <b>${this.getComparisonString(maxDistance, CONFIG.DISTANCE_COMPARISONS)}</b>!`;
    },

    /**
     * Calcula e formata a comparação com itens do mundo real.
     */
    getComparisonString(value, list) {
        if (value <= 0) return "nadinha! 🛑";

        let bestItem = list[0];
        let minDiff = Infinity;

        for (let item of list) {
            const itemVal = item.height || item.distance;
            const diff = Math.abs(value - itemVal);
            if (diff < minDiff) {
                minDiff = diff;
                bestItem = item;
            }
        }

        const itemVal = bestItem.height || bestItem.distance;
        const count = value / itemVal;
        const countFormatted = count.toFixed(1);

        if (countFormatted === "1.0") {
            return `a altura de ${bestItem.name}`;
        } else {
            return `${countFormatted}x ${bestItem.name}`;
        }
    },

    /**
     * Incrementa a pontuação da rodada.
     * @param {number} amount 
     */
    addScore(amount = 10) {
        this.score += amount;
        this.hudScore.textContent = this.score;
        this.playSynthSound("success");
    },

    /**
     * Exibe uma dica ou fato científico na nuvem do robô.
     */
    showNewTip() {
        const tips = CONFIG.TIPS;
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        this.hudTip.textContent = randomTip;

        this.hudTipBubble.classList.remove("pulse-animation");
        void this.hudTipBubble.offsetWidth; // Forçar reflow CSS
        this.hudTipBubble.classList.add("pulse-animation");
    },

    /**
     * Gera os efeitos sonoros em tempo real (Web Audio API).
     */
    playSynthSound(type) {
        if (this.isMuted) return;

        try {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const ctx = this.audioCtx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;

            if (type === "launch") {
                osc.type = "sine";
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
                
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                
                osc.start(now);
                osc.stop(now + 0.3);

            } else if (type === "impact") {
                osc.type = "triangle";
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.setValueAtTime(60, now + 0.1);
                
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                
                osc.start(now);
                osc.stop(now + 0.15);

            } else if (type === "woodBreak") {
                for (let i = 0; i < 3; i++) {
                    const oscW = ctx.createOscillator();
                    const gainW = ctx.createGain();
                    oscW.connect(gainW);
                    gainW.connect(ctx.destination);
                    
                    const timeOffset = i * 0.04;
                    oscW.type = "triangle";
                    oscW.frequency.setValueAtTime(80 + Math.random() * 60, now + timeOffset);
                    
                    gainW.gain.setValueAtTime(0.25, now + timeOffset);
                    gainW.gain.exponentialRampToValueAtTime(0.01, now + timeOffset + 0.08);
                    
                    oscW.start(now + timeOffset);
                    oscW.stop(now + timeOffset + 0.08);
                }

            } else if (type === "success") {
                osc.type = "triangle";
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.setValueAtTime(659.25, now + 0.12);
                osc.frequency.setValueAtTime(783.99, now + 0.24);
                osc.frequency.setValueAtTime(1046.50, now + 0.36);

                gain.gain.setValueAtTime(0.25, now);
                gain.gain.setValueAtTime(0.25, now + 0.36);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

                osc.start(now);
                osc.stop(now + 0.6);

            } else if (type === "select") {
                osc.type = "sine";
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

                osc.start(now);
                osc.stop(now + 0.05);

            } else if (type === "targetChange") {
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(500, now + 0.25);

                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

                osc.start(now);
                osc.stop(now + 0.25);
            }

        } catch (error) {
            console.error("Falha ao sintetizar som:", error);
        }
    }
};

if (typeof module !== 'undefined') {
    module.exports = UI;
}
