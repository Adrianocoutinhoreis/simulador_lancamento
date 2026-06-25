// MOTOR FÍSICO DO SIMULADOR DE LANÇAMENTO OBLÍQUO INFANTIL
// Este arquivo cuida de toda a matemática e equações de trajetória física.

const Physics = {
    /**
     * Converte graus para radianos.
     * @param {number} degrees - Ângulo em graus.
     * @returns {number} Ângulo em radianos.
     */
    degreesToRadians(degrees) {
        return (degrees * Math.PI) / 180;
    },

    /**
     * Calcula as componentes iniciais da velocidade.
     * @param {number} velocity - Velocidade inicial escalar (m/s).
     * @param {number} angleDegrees - Ângulo de lançamento (graus).
     * @returns {{x: number, y: number}} Velocidades iniciais Vx e Vy.
     */
    getInitialVelocityComponents(velocity, angleDegrees) {
        const rad = this.degreesToRadians(angleDegrees);
        return {
            x: velocity * Math.cos(rad),
            y: velocity * Math.sin(rad)
        };
    },

    /**
     * Calcula a posição (x, y) de um corpo em um tempo t específico.
     * Considere y=0 como a altura inicial de lançamento.
     * @param {number} t - Tempo decorrido (segundos).
     * @param {number} v0 - Velocidade inicial (m/s).
     * @param {number} angleDegrees - Ângulo de lançamento (graus).
     * @param {number} g - Aceleração da gravidade (m/s²).
     * @returns {{x: number, y: number}} Coordenadas físicas do projétil.
     */
    getPositionAtTime(t, v0, angleDegrees, g) {
        const v0Components = this.getInitialVelocityComponents(v0, angleDegrees);
        
        const x = v0Components.x * t;
        const y = (v0Components.y * t) - (0.5 * g * t * t);
        
        return { x, y };
    },

    /**
     * Calcula a velocidade (Vx, Vy) de um corpo em um tempo t específico.
     * @param {number} t - Tempo decorrido (segundos).
     * @param {number} v0 - Velocidade inicial (m/s).
     * @param {number} angleDegrees - Ângulo de lançamento (graus).
     * @param {number} g - Aceleração da gravidade (m/s²).
     * @returns {{x: number, y: number}} Velocidade instantânea em X e Y.
     */
    getVelocityAtTime(t, v0, angleDegrees, g) {
        const v0Components = this.getInitialVelocityComponents(v0, angleDegrees);
        
        const vx = v0Components.x;
        const vy = v0Components.y - (g * t);
        
        return { x: vx, y: vy };
    },

    /**
     * Calcula dados estáticos do voo (tempo total, altura máx, distância máx).
     * @param {number} v0 - Velocidade inicial (m/s).
     * @param {number} angleDegrees - Ângulo de lançamento (graus).
     * @param {number} g - Aceleração da gravidade (m/s²).
     * @returns {{flightTime: number, maxHeight: number, maxDistance: number, timeToMaxHeight: number}} Estatísticas.
     */
    calculateFlightStats(v0, angleDegrees, g) {
        const v0Components = this.getInitialVelocityComponents(v0, angleDegrees);
        
        // Tempo de subida: v_y = 0 => t_subida = v0y / g
        const timeToMaxHeight = v0Components.y / g;
        
        // Tempo total de voo (até tocar o chão y = 0 de volta): t_voo = 2 * t_subida
        const flightTime = 2 * timeToMaxHeight;
        
        // Altura máxima: h = (v0y^2) / (2 * g)
        const maxHeight = (v0Components.y * v0Components.y) / (2 * g);
        
        // Alcance máximo horizontal: d = v0x * t_voo
        const maxDistance = v0Components.x * flightTime;
        
        return {
            flightTime: Math.max(0, flightTime),
            maxHeight: Math.max(0, maxHeight),
            maxDistance: Math.max(0, maxDistance),
            timeToMaxHeight: Math.max(0, timeToMaxHeight)
        };
    },

    /**
     * Gera uma lista de pontos (x, y) representando a trajetória completa do projétil.
     * @param {number} v0 - Velocidade inicial (m/s).
     * @param {number} angleDegrees - Ângulo de lançamento (graus).
     * @param {number} g - Aceleração da gravidade (m/s²).
     * @param {number} stepsCount - Número de pontos desejados.
     * @returns {Array<{x: number, y: number, t: number}>} Trajetória de pontos.
     */
    generateTrajectoryPoints(v0, angleDegrees, g, stepsCount = 100) {
        const stats = this.calculateFlightStats(v0, angleDegrees, g);
        const points = [];
        
        if (stats.flightTime <= 0) return points;
        
        const dt = stats.flightTime / (stepsCount - 1);
        
        for (let i = 0; i < stepsCount; i++) {
            const t = i * dt;
            const pos = this.getPositionAtTime(t, v0, angleDegrees, g);
            points.push({
                x: pos.x,
                y: pos.y,
                t: t
            });
        }
        
        return points;
    }
};

// Exportar para escopo global ou módulos caso decida usar
if (typeof module !== 'undefined') {
    module.exports = Physics;
}
