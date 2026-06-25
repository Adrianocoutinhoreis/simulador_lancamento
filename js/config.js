// CONFIGURAÇÕES DO SIMULADOR DE LANÇAMENTO OBLÍQUO INFANTIL
// Este arquivo contém todas as constantes, parâmetros visuais, dados dos planetas e comparações educativas.

const CONFIG = {
    // Configurações do Canvas e Escala física
    // 1 metro na física = X pixels na tela (ajustado dinamicamente para caber na tela)
    PIXELS_PER_METER: 8,

    // Gravidades dos planetas/mundos (m/s²)
    PLANETS: {
        terra: {
            name: "Terra 🌍",
            gravity: 9.81,
            color: "#4e9f3d",
            skyColor: "linear-gradient(to top, #a1c4fd 0%, #c2e9fb 100%)",
            groundColor: "#228B22",
            description: "Gravidade normal! É onde vivemos. Tudo cai no ritmo que já conhecemos.",
            funFact: "A gravidade aqui nos mantém firmes no chão sem flutuar!"
        },
        lua: {
            name: "Lua 🌕",
            gravity: 1.62,
            color: "#d3d3d3",
            skyColor: "linear-gradient(to top, #0f2027, #203a43, #2c5364)",
            groundColor: "#808080",
            description: "Gravidade super fraca! Você se sente muito leve e tudo flutua bastante.",
            funFact: "Os astronautas na Lua conseguem dar pulos gigantescos!"
        },
        marte: {
            name: "Marte 🔴",
            gravity: 3.71,
            color: "#d85c27",
            skyColor: "linear-gradient(to top, #e65c00, #f9d423)",
            groundColor: "#c24e1d",
            description: "Gravidade média! As coisas caem mais devagar que na Terra, mas mais rápido que na Lua.",
            funFact: "Marte é conhecido como o Planeta Vermelho por causa do seu solo de ferro enferrujado!"
        },
        jupiter: {
            name: "Júpiter 🪐",
            gravity: 24.79,
            color: "#b07d62",
            skyColor: "linear-gradient(to top, #2b1055, #7597de)",
            groundColor: "#8b5a2b",
            description: "Gravidade gigantesca! Tudo é puxado muito forte e rápido para o chão.",
            funFact: "Júpiter é tão pesado que atrai as coisas com quase 2.5x a força da Terra!"
        }
    },

    // Projéteis divertidos com propriedades físicas e efeitos visuais
    PROJECTILES: {
        tomate: {
            id: "tomate",
            name: "Tomatinho 🍅",
            emoji: "🍅",
            radius: 12,
            mass: 0.15,
            trailColor: "rgba(255, 99, 71, 0.85)",
            impactType: "splat",
            impactColor: "#ff4d4d",
            impactParticles: 20,
            soundText: "NHEC! 🍅💦"
        },
        balao: {
            id: "balao",
            name: "Balão de Água 🎈",
            emoji: "🎈",
            radius: 14,
            mass: 0.25,
            trailColor: "rgba(30, 144, 255, 0.85)",
            impactType: "splash",
            impactColor: "#1e90ff",
            impactParticles: 25,
            soundText: "SPLASH! 💦"
        },
        sapo: {
            id: "sapo",
            name: "Sapo Saltador 🐸",
            emoji: "🐸",
            radius: 13,
            mass: 0.20,
            trailColor: "rgba(50, 205, 50, 0.85)",
            impactType: "jump",
            impactColor: "#87d37c",
            impactParticles: 15,
            soundText: "RIBBIT! 🐸"
        },
        foguete: {
            id: "foguete",
            name: "Mini Bomba 💣",
            emoji: "💣",
            radius: 5,
            mass: 0.10,
            trailColor: "rgba(255, 165, 0, 0.9)",
            impactType: "smoke",
            impactColor: "#ff8c00",
            impactParticles: 30,
            soundText: "CABUM! 💥"
        }
    },

    // Comparações de altura para a HUD
    HEIGHT_COMPARISONS: [
        { height: 0.3, name: "um Gatinho 🐱", emoji: "🐱" },
        { height: 0.8, name: "um Cachorro Golden 🐕", emoji: "🐕" },
        { height: 2.0, name: "um Jogador de Basquete 🏀", emoji: "🏀" },
        { height: 5.5, name: "uma Girafa Gigante 🦒", emoji: "🦒" },
        { height: 9.0, name: "uma Casa de dois andares 🏠", emoji: "🏠" },
        { height: 15.0, name: "um Dinossauro T-Rex 🦖", emoji: "🦖" },
        { height: 30.0, name: "um Prédio de 10 andares 🏢", emoji: "🏢" },
        { height: 46.0, name: "a Estátua da Liberdade 🗽", emoji: "🗽" },
        { height: 93.0, name: "o Big Ben 🕰️", emoji: "🕰️" },
        { height: 300.0, name: "a Torre Eiffel 🗼", emoji: "🗼" }
    ],

    // Comparações de distância para a HUD
    DISTANCE_COMPARISONS: [
        { distance: 1.0, name: "uma Passada Larga "},
        { distance: 4.5, name: "um Carro Comum " },
        { distance: 12.0, name: "um Ônibus Escolar Amarelo 🚌" },
        { distance: 20.0, name: "uma Baleia Azul 🐋" },
        { distance: 50.0, name: "uma Piscina Olímpica 🏊" },
        { distance: 105.0, name: "um Campo de Futebol Oficial ⚽" },
        { distance: 324.0, name: "o comprimento da Torre Eiffel deitada 🗼" },
        { distance: 500.0, name: "5 quadras de rua! 🚏" }
    ],

    // Frases motivacionais ou explicativas aleatórias
    TIPS: [
        "Sabia que o ângulo de 45° é o que faz o projétil ir mais longe na Terra?",
        "Quanto menor a gravidade (como na Lua), mais longe e alto o seu brinquedo vai voar!",
        "A gravidade é como um ímã invisível do chão que puxa tudo para baixo o tempo todo.",
        "Se você jogar com muita força (alta velocidade), o tempo no ar será muito maior!",
        "Olhe as flechas azul e amarela! Elas mostram a velocidade empurrando e a gravidade puxando!"
    ],

    // Dicas específicas para a Fase 5 (Análise de Vetores)
    VECTOR_TIPS: [
        "🔵 Vx (horizontal) é CONSTANTE! Ele nunca muda durante o voo porque não há força empurrando para os lados.",
        "🟢 Vy começa positivo (subindo) e vai diminuindo até zero no ponto mais alto!",
        "🔴 No ponto mais alto, Vy = 0! O projétil para de subir antes de começar a cair.",
        "⬇️ Depois do ponto mais alto, Vy fica negativo: o projétil está caindo!",
        "📐 O ângulo de lançamento divide a velocidade inicial em duas partes: Vx = V₀·cos(θ) e Vy = V₀·sen(θ)",
        "🏹 As duas flechas juntas formam a velocidade total do projétil!",
        "🎯 Para acertar um alvo no ar, você precisa calcular em que momento Vy coloca o projétil na altura certa!"
    ],

    // Banco de perguntas para o quiz da Fase 5
    VECTOR_QUIZ_QUESTIONS: [
        {
            id: "vx_constant",
            context: "meio_do_voo",
            question: "Durante todo o voo, o que acontece com a componente horizontal Vx?",
            options: ["Vx diminui por causa da gravidade", "Vx permanece constante (não muda!)", "Vx aumenta conforme o projétil acelera"],
            correct: 1,
            explanation: "✅ Correto! Vx é CONSTANTE porque não existe força horizontal atuando sobre o projétil (sem atrito do ar). Apenas a gravidade age, e ela é vertical!"
        },
        {
            id: "vy_apex",
            context: "ponto_mais_alto",
            question: "No ponto mais alto da trajetória (ápice), qual é o valor de Vy?",
            options: ["Vy é máximo (mais rápido subindo)", "Vy = 0 (zero!)", "Vy é negativo (caindo)"],
            correct: 1,
            explanation: "✅ Excelente! No ápice, o projétil para momentaneamente de subir, então Vy = 0. A gravidade ainda está atuando e vai inverter o sentido de Vy!"
        },
        {
            id: "vy_direction_up",
            context: "subindo",
            question: "O projétil está subindo. Qual sinal tem Vy nesse momento?",
            options: ["Vy é negativo (pra baixo)", "Vy é zero", "Vy é positivo (pra cima)"],
            correct: 2,
            explanation: "✅ Perfeito! Enquanto o projétil sobe, Vy é positivo. A gravidade vai diminuindo Vy aos poucos até chegar a zero no ponto mais alto."
        },
        {
            id: "vy_direction_down",
            context: "descendo",
            question: "O projétil está descendo. O que aconteceu com Vy?",
            options: ["Vy ainda é positivo mas pequeno", "Vy ficou negativo (inverteu!)", "Vy voltou ao valor inicial"],
            correct: 1,
            explanation: "✅ Isso mesmo! Depois do ápice, a gravidade continua acelerando o projétil para baixo, fazendo Vy ficar negativo (sentido descendente)."
        },
        {
            id: "angle_components",
            context: "lancamento",
            question: "Se lançar com ângulo de 45°, quem é maior: Vx ou Vy?",
            options: ["Vx é maior que Vy", "Vy é maior que Vx", "Vx e Vy são iguais!"],
            correct: 2,
            explanation: "✅ Correto! A 45°, sen(45°) = cos(45°) ≈ 0,707. Então Vx = Vy! Por isso 45° é o ângulo de maior alcance horizontal."
        },
        {
            id: "high_angle",
            context: "lancamento",
            question: "Com ângulo de 70°, qual componente é maior na largada?",
            options: ["Vx (componente horizontal)", "Vy (componente vertical)", "As duas são iguais"],
            correct: 1,
            explanation: "✅ Exato! Com ângulo alto (>45°), sen(70°) > cos(70°), então Vy > Vx. O projétil sobe muito alto mas não vai tão longe horizontalmente!"
        },
        {
            id: "gravity_effect",
            context: "meio_do_voo",
            question: "A gravidade afeta qual componente da velocidade?",
            options: ["Só Vx (horizontal)", "Só Vy (vertical)", "As duas, Vx e Vy"],
            correct: 1,
            explanation: "✅ Correto! A gravidade só puxa para baixo (verticalmente), então só afeta Vy. Vx fica inalterado durante todo o voo!"
        }
    ]
};

// Exportar para escopo global ou módulos caso decida usar
if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
