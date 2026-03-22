// ── 設定 ──────────────────────────────────────────────
const MAX_ATTEMPTS = 6;
const DURATIONS = [120, 120, 120, 120, 120, 120];
const ROUND_COUNT = 5; // 每次開啟隨機出幾題

// ── 狀態 ──────────────────────────────────────────────
let songs = [];
let queue = [];
let queueIndex = 0;
let currentSong = null;
let attemptIndex = 0;
let guesses = [];
let gameOver = false;
let playTimer = null;
let countdownTimer = null;
let scoreCorrect = 0;

// ── DOM ───────────────────────────────────────────────
const attemptsEl = document.getElementById('attempts');
const playBtn = document.getElementById('play-btn');
const durationLabel = document.getElementById('duration-label');
const guessListEl = document.getElementById('guess-list');
const choicesEl = document.getElementById('choices');
const skipBtn = document.getElementById('skip-btn');
const inputSection = document.getElementById('input-section');
const resultScreen = document.getElementById('result-screen');
const resultIcon = document.getElementById('result-icon');
const resultTitle = document.getElementById('result-title');
const resultArtist = document.getElementById('result-artist');
const resultGame = document.getElementById('result-game');
const nextBtn = document.getElementById('next-btn');
const scoreCorrectEl = document.getElementById('score-correct');
const scoreTotalEl = document.getElementById('score-total');
const finalScreen = document.getElementById('final-screen');
const finalIcon = document.getElementById('final-icon');
const finalScore = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// ── 音訊播放器 ────────────────────────────────────────
const audio = new Audio();

// ── 載入歌曲 ──────────────────────────────────────────
fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    songs = data;
    startGame();
  });

// ── 開始新遊戲（隨機選 ROUND_COUNT 首不重複） ──────────
function startGame() {
  const shuffled = [...songs].sort(() => Math.random() - 0.5);
  queue = shuffled.slice(0, ROUND_COUNT);
  queueIndex = 0;
  scoreCorrect = 0;
  scoreCorrectEl.textContent = 0;
  scoreTotalEl.textContent = ROUND_COUNT;
  finalScreen.style.display = 'none';
  startNewRound();
}

// ── 遊戲流程 ──────────────────────────────────────────
function startNewRound() {
  currentSong = queue[queueIndex];
  attemptIndex = 0;
  guesses = [];
  gameOver = false;

  audio.src = currentSong.audioFile;
  audio.load();
  audio.currentTime = 0;

  renderAttempts();
  renderGuessList();
  durationLabel.textContent = '';
  renderChoices();

  resultScreen.classList.remove('show');
  inputSection.style.display = 'flex';
  playBtn.disabled = false;
}

function renderAttempts() {
  attemptsEl.innerHTML = '';
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const dot = document.createElement('div');
    dot.className = 'attempt-dot';
    if (i < guesses.length) {
      dot.classList.add(guesses[i].correct ? 'correct' : 'wrong');
    }
    attemptsEl.appendChild(dot);
  }
}

function renderGuessList() {
  guessListEl.innerHTML = '';
  guesses.forEach(g => {
    const li = document.createElement('li');
    li.className = g.skipped ? 'skipped' : 'wrong';
    li.textContent = g.skipped ? '跳過' : g.text;
    guessListEl.appendChild(li);
  });
}

// ── 播放 ──────────────────────────────────────────────
playBtn.addEventListener('click', () => {
  if (gameOver) return;
  playSnippet();
});

function playSnippet() {
  clearTimeout(playTimer);
  clearInterval(countdownTimer);

  const secs = DURATIONS[Math.min(attemptIndex, DURATIONS.length - 1)];
  audio.currentTime = 0;
  audio.play();
  playBtn.disabled = true;

  let remaining = secs;
  durationLabel.textContent = `${remaining}`;
  countdownTimer = setInterval(() => {
    remaining--;
    durationLabel.textContent = `${remaining}`;
    if (remaining <= 0) clearInterval(countdownTimer);
  }, 1000);

  playTimer = setTimeout(() => {
    audio.pause();
    clearInterval(countdownTimer);
    durationLabel.textContent = '';
    playBtn.disabled = false;
  }, secs * 1000);
}

// ── 選擇題 ────────────────────────────────────────────
function renderChoices() {
  choicesEl.innerHTML = '';

  const allGames = [...new Set(songs.map(s => s.gameName))];
  const wrongs = allGames.filter(g => g !== currentSong.gameName);

  const shuffledWrongs = wrongs.sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [...shuffledWrongs, currentSong.gameName].sort(() => Math.random() - 0.5);

  options.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = name;
    btn.addEventListener('click', () => submitGuess(name));
    choicesEl.appendChild(btn);
  });
}

// ── 提交猜測 ──────────────────────────────────────────
function submitGuess(val) {
  if (gameOver) return;

  const correct = val === currentSong.gameName;
  guesses.push({ text: val, correct, skipped: false });

  if (correct) {
    endRound(true);
  } else {
    attemptIndex++;
    renderAttempts();
    renderGuessList();
    updateDurationLabel();
    if (attemptIndex >= MAX_ATTEMPTS) endRound(false);
  }
}

// ── 跳過 ──────────────────────────────────────────────
skipBtn.addEventListener('click', () => {
  if (gameOver) return;
  guesses.push({ text: '', correct: false, skipped: true });
  attemptIndex++;
  renderAttempts();
  renderGuessList();
  updateDurationLabel();
  if (attemptIndex >= MAX_ATTEMPTS) endRound(false);
});

// ── 結束單題 ──────────────────────────────────────────
function endRound(won) {
  gameOver = true;
  clearTimeout(playTimer);
  clearInterval(countdownTimer);
  durationLabel.textContent = '';
  audio.pause();

  if (won) scoreCorrect++;
  scoreCorrectEl.textContent = scoreCorrect;

  inputSection.style.display = 'none';
  resultScreen.classList.add('show');
  resultIcon.textContent = won ? '🎉' : '😢';
  resultTitle.textContent = `歌名：${currentSong.title}`;
  resultArtist.textContent = `歌手：${currentSong.artist}`;
  resultGame.textContent = `遊戲名：${currentSong.gameName}`;

  const isLast = queueIndex >= ROUND_COUNT - 1;
  nextBtn.textContent = isLast ? '查看結果' : '下一題';
}

// ── 下一題 / 查看結果 ─────────────────────────────────
nextBtn.addEventListener('click', () => {
  queueIndex++;
  if (queueIndex >= ROUND_COUNT) {
    showFinalScreen();
  } else {
    startNewRound();
  }
});

// ── 最終結果 ──────────────────────────────────────────
function showFinalScreen() {
  resultScreen.classList.remove('show');
  inputSection.style.display = 'none';
  finalIcon.textContent = scoreCorrect === ROUND_COUNT ? '🏆' : scoreCorrect > 0 ? '👏' : '😢';
  finalScore.textContent = `答對 ${scoreCorrect} / ${ROUND_COUNT} 題`;
  finalScreen.style.display = 'block';
}

restartBtn.addEventListener('click', startGame);
