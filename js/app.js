// ===== Configuração geral =====
const QUESTOES_POR_QUIZ = 10;

// ===== Configuração das disciplinas =====
const SUBJECTS = [
  { id: "portugues",  name: "Português",  icon: "📚", color: "#8ecae6", file: "portugues.json" },
  { id: "ditado",     name: "Ditado",     icon: "✏️", color: "#ffb4a2", file: "ditado.json" },
  { id: "matematica", name: "Matemática", icon: "🔢", color: "#ffd166", file: "matematica.json" },
  { id: "geografia",  name: "Geografia",  icon: "🌎", color: "#95d5b2", file: "geografia.json" },
  { id: "historia",   name: "História",  icon: "🏛️", color: "#d4a373", file: "historia.json" },
  { id: "ingles",     name: "Inglês",     icon: "🗣️", color: "#c8b6ff", file: "ingles.json" },
  { id: "ciencias",   name: "Ciências",   icon: "🔬", color: "#90e0ef", file: "ciencias.json" },
  { id: "religiao",   name: "Religião",   icon: "🙏", color: "#f4a3c1", file: "religiao.json" },
];

// ===== Estado do quiz =====
const state = {
  subject: null,
  questions: [],
  currentIndex: 0,
  score: 0,
  answered: false,
  selected: new Set(),
};

// ===== Elementos =====
const homeScreen = document.getElementById("home-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const cardsContainer = document.getElementById("cards-container");
const quizTitle = document.getElementById("quiz-title");
const scoreDisplay = document.getElementById("score-display");
const progressBarInner = document.getElementById("progress-bar-inner");
const questionCounter = document.getElementById("question-counter");
const questionImage = document.getElementById("question-image");
const questionText = document.getElementById("question-text");
const alternativesContainer = document.getElementById("alternatives-container");
const feedbackMessage = document.getElementById("feedback-message");
const btnNext = document.getElementById("btn-next");
const btnConfirm = document.getElementById("btn-confirm");
const btnListen = document.getElementById("btn-listen");
const btnBack = document.getElementById("btn-back");

const resultEmoji = document.getElementById("result-emoji");
const resultTitle = document.getElementById("result-title");
const resultScore = document.getElementById("result-score");
const btnRetry = document.getElementById("btn-retry");
const btnHome = document.getElementById("btn-home");
const confettiLayer = document.getElementById("confetti-layer");

// ===== Sons simples (Web Audio API, sem arquivos externos) =====
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, start, duration, type = "sine", volume = 0.2, endFreq = null) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  if (endFreq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + start + duration);
  }
  gain.gain.setValueAtTime(volume, ctx.currentTime + start);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.stop(ctx.currentTime + start + duration + 0.05);
}

function playNoiseBurst(start, duration, volume = 0.15, filterFreq = 900) {
  const ctx = getAudioCtx();
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime + start);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  noise.stop(ctx.currentTime + start + duration + 0.05);
}

function playCorrectSound() {
  // Arpejo brilhante + acorde final com brilho agudo (efeito "sininho")
  playTone(523.25, 0, 0.12, "triangle", 0.28);
  playTone(659.25, 0.09, 0.12, "triangle", 0.28);
  playTone(783.99, 0.18, 0.14, "triangle", 0.28);
  playTone(1046.5, 0.29, 0.32, "sine", 0.32);
  playTone(1318.5, 0.29, 0.28, "sine", 0.18);
  playTone(1567.98, 0.34, 0.24, "sine", 0.12);
}

function playWrongSound() {
  // Buzzer descendente + rugido de ruído grave para um "erro" mais marcante
  playTone(320, 0, 0.16, "sawtooth", 0.22, 220);
  playTone(220, 0.14, 0.2, "sawtooth", 0.2, 140);
  playTone(140, 0.3, 0.28, "square", 0.16, 90);
  playNoiseBurst(0, 0.35, 0.14, 500);
}

function playClickSound() {
  playTone(440, 0, 0.06, "square", 0.08);
}

function playCelebrationSound() {
  [523.25, 587.33, 659.25, 783.99, 880, 1046.5].forEach((f, i) =>
    playTone(f, i * 0.11, 0.22, "triangle", 0.26)
  );
  playNoiseBurst(0.6, 0.4, 0.06, 4000);
}

function speakWord(word) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = "pt-BR";
  utter.rate = 0.85;
  utter.pitch = 1.1;
  window.speechSynthesis.speak(utter);
}

// ===== Navegação entre telas =====
function showScreen(screen) {
  [homeScreen, quizScreen, resultScreen].forEach((s) => s.classList.remove("active"));
  screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== Construção dos cards da home =====
function renderCards() {
  cardsContainer.innerHTML = "";
  SUBJECTS.forEach((subject) => {
    const card = document.createElement("button");
    card.className = "subject-card";
    card.style.setProperty("--card-color", subject.color);
    card.innerHTML = `
      <span class="subject-icon">${subject.icon}</span>
      <span class="subject-name">${subject.name}</span>
    `;
    card.addEventListener("click", () => {
      playClickSound();
      startQuiz(subject);
    });
    cardsContainer.appendChild(card);
  });
}

// ===== Carregar e iniciar um quiz =====
async function startQuiz(subject) {
  try {
    const response = await fetch(`subjects/${subject.file}`);
    if (!response.ok) throw new Error("Falha ao carregar perguntas");
    const data = await response.json();

    state.subject = subject;
    state.questions = shuffleArray(data.questoes.slice()).slice(0, QUESTOES_POR_QUIZ);
    state.currentIndex = 0;
    state.score = 0;

    quizTitle.textContent = `${subject.icon} ${subject.name}`;
    scoreDisplay.textContent = "0";
    showScreen(quizScreen);
    renderQuestion();
  } catch (err) {
    alert(
      "Não foi possível carregar as perguntas. Se você abriu o arquivo diretamente (file://), " +
      "rode um servidor local, por exemplo:\n\npython3 -m http.server\n\ne acesse http://localhost:8000"
    );
    console.error(err);
  }
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ===== Renderizar pergunta atual =====
function renderQuestion() {
  state.answered = false;
  state.selected = new Set();
  feedbackMessage.textContent = "";
  feedbackMessage.className = "feedback-message";
  btnNext.style.display = "none";
  btnConfirm.style.display = "none";
  btnConfirm.disabled = true;

  const question = state.questions[state.currentIndex];
  const total = state.questions.length;

  questionCounter.textContent = `Pergunta ${state.currentIndex + 1} de ${total}`;
  progressBarInner.style.width = `${(state.currentIndex / total) * 100}%`;

  questionText.textContent = question.pergunta;

  // Imagem: arquivo de imagem (img/*.svg|png|jpg) ou emoji direto, exibida sempre que presente
  // "imagens" (array) permite mostrar várias imagens juntas (ex: notas e moedas a somar)
  questionImage.innerHTML = "";
  if (question.imagens && Array.isArray(question.imagens)) {
    question.imagens.forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = question.pergunta;
      img.className = "question-img money-img";
      questionImage.appendChild(img);
    });
  } else if (question.imagem) {
    if (/\.(svg|png|jpe?g|webp)$/i.test(question.imagem)) {
      const img = document.createElement("img");
      img.src = question.imagem;
      img.alt = question.pergunta;
      img.className = "question-img";
      questionImage.appendChild(img);
    } else {
      questionImage.textContent = question.imagem;
    }
  }

  // Ditado: botão de ouvir a palavra
  if (question.tipo === "ditado" && question.palavra) {
    btnListen.style.display = "block";
    btnListen.onclick = () => {
      btnListen.classList.add("playing");
      speakWord(question.palavra);
      setTimeout(() => btnListen.classList.remove("playing"), 700);
    };
    setTimeout(() => btnListen.click(), 300);
  } else {
    btnListen.style.display = "none";
    btnListen.onclick = null;
  }

  // Alternativas
  alternativesContainer.innerHTML = "";
  alternativesContainer.classList.remove("multi-grid");

  if (question.tipo === "multipla_resposta") {
    renderMultiAlternatives(question);
  } else {
    const hasImageAlts = question.alternativas.some((alt) => alt.imagem);
    if (hasImageAlts) alternativesContainer.classList.add("multi-grid");

    question.alternativas.forEach((alt) => {
      const btn = document.createElement("button");
      btn.dataset.id = alt.id;
      if (alt.imagem) {
        btn.className = "alt-btn img-variant";
        btn.innerHTML = `<img src="${alt.imagem}" alt="${alt.texto || alt.id}"><span class="alt-img-label">${alt.texto || ""}</span>`;
      } else {
        btn.className = "alt-btn";
        btn.innerHTML = `<span class="alt-id">${alt.id}</span><span>${alt.texto}</span>`;
      }
      btn.addEventListener("click", () => selectAnswer(alt.id, question, btn));
      alternativesContainer.appendChild(btn);
    });
  }
}

// ===== Alternativas de imagem com múltiplas respostas corretas =====
function renderMultiAlternatives(question) {
  alternativesContainer.classList.add("multi-grid");

  question.alternativas.forEach((alt) => {
    const btn = document.createElement("button");
    btn.className = "alt-img-btn";
    btn.dataset.id = alt.id;
    btn.innerHTML = `
      <img src="${alt.imagem}" alt="${alt.texto || alt.id}">
      <span class="alt-img-label">${alt.texto || ""}</span>
    `;
    btn.addEventListener("click", () => {
      if (state.answered) return;
      if (state.selected.has(alt.id)) {
        state.selected.delete(alt.id);
        btn.classList.remove("selected");
      } else {
        state.selected.add(alt.id);
        btn.classList.add("selected");
      }
      btnConfirm.disabled = state.selected.size === 0;
    });
    alternativesContainer.appendChild(btn);
  });

  btnConfirm.style.display = "block";
  btnConfirm.disabled = true;
  btnConfirm.onclick = () => confirmMultiAnswer(question);
}

function confirmMultiAnswer(question) {
  if (state.answered || state.selected.size === 0) return;
  state.answered = true;
  playClickSound();

  const correctSet = new Set(question.respostas);
  const buttons = alternativesContainer.querySelectorAll(".alt-img-btn");
  buttons.forEach((btn) => (btn.disabled = true));

  let isFullyCorrect = true;
  buttons.forEach((btn) => {
    const id = btn.dataset.id;
    const isSelected = state.selected.has(id);
    const isCorrectOption = correctSet.has(id);
    if (isSelected && isCorrectOption) {
      btn.classList.add("correct");
    } else if (isSelected && !isCorrectOption) {
      btn.classList.add("wrong");
      isFullyCorrect = false;
    } else if (!isSelected && isCorrectOption) {
      btn.classList.add("missed");
      isFullyCorrect = false;
    }
  });

  btnConfirm.style.display = "none";

  if (isFullyCorrect) {
    state.score++;
    scoreDisplay.textContent = state.score;
    feedbackMessage.textContent = "Isso mesmo! 🎉";
    feedbackMessage.classList.add("correct");
    playCorrectSound();
  } else {
    const corretas = question.alternativas
      .filter((a) => correctSet.has(a.id))
      .map((a) => a.id)
      .join(", ");
    feedbackMessage.textContent = `Quase! As respostas certas são: ${corretas}.`;
    feedbackMessage.classList.add("wrong");
    playWrongSound();
  }

  btnNext.style.display = "block";
}

// ===== Selecionar resposta =====
function selectAnswer(selectedId, question, clickedBtn) {
  if (state.answered) return;
  state.answered = true;

  const buttons = alternativesContainer.querySelectorAll(".alt-btn");
  buttons.forEach((btn) => (btn.disabled = true));

  const isCorrect = selectedId === question.resposta;

  buttons.forEach((btn) => {
    if (btn.dataset.id === question.resposta) {
      btn.classList.add("correct");
    } else if (btn === clickedBtn) {
      btn.classList.add("wrong");
    }
  });

  if (isCorrect) {
    state.score++;
    scoreDisplay.textContent = state.score;
    feedbackMessage.textContent = "Isso mesmo! 🎉";
    feedbackMessage.classList.add("correct");
    playCorrectSound();
  } else {
    feedbackMessage.textContent = `Quase! A resposta certa é a ${question.resposta}.`;
    feedbackMessage.classList.add("wrong");
    playWrongSound();
  }

  btnNext.style.display = "block";
}

// ===== Próxima pergunta / resultado =====
btnNext.addEventListener("click", () => {
  playClickSound();
  state.currentIndex++;
  if (state.currentIndex >= state.questions.length) {
    showResult();
  } else {
    renderQuestion();
  }
});

function showResult() {
  progressBarInner.style.width = "100%";
  const total = state.questions.length;
  const pct = total ? state.score / total : 0;

  resultScore.textContent = `Você acertou ${state.score} de ${total} perguntas`;

  if (pct === 1) {
    resultEmoji.textContent = "🏆";
    resultTitle.textContent = "Perfeito! Nota máxima!";
  } else if (pct >= 0.7) {
    resultEmoji.textContent = "🌟";
    resultTitle.textContent = "Muito bem!";
  } else if (pct >= 0.5) {
    resultEmoji.textContent = "👍";
    resultTitle.textContent = "Bom trabalho!";
  } else {
    resultEmoji.textContent = "💪";
    resultTitle.textContent = "Vamos praticar mais um pouco!";
  }

  showScreen(resultScreen);
  playCelebrationSound();
  if (pct >= 0.5) launchConfetti();
}

function launchConfetti() {
  confettiLayer.innerHTML = "";
  const emojis = ["🎉", "✨", "⭐", "🎊", "💫"];
  for (let i = 0; i < 28; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    piece.style.left = `${Math.random() * 100}%`;
    const duration = 2.2 + Math.random() * 1.6;
    piece.style.animationDuration = `${duration}s`;
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    confettiLayer.appendChild(piece);
  }
  setTimeout(() => {
    confettiLayer.innerHTML = "";
  }, 4500);
}

// ===== Botões de navegação =====
btnBack.addEventListener("click", () => {
  playClickSound();
  window.speechSynthesis && window.speechSynthesis.cancel();
  showScreen(homeScreen);
});

btnRetry.addEventListener("click", () => {
  playClickSound();
  startQuiz(state.subject);
});

btnHome.addEventListener("click", () => {
  playClickSound();
  showScreen(homeScreen);
});

// ===== Inicialização =====
renderCards();
