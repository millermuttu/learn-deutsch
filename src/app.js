import { vocabulary } from './data.js';

// Signal to the page to skip inline script
window.__USE_MODULE_APP__ = true;

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  let userProgress = {};
  let currentQuiz = [];
  let currentQuestionIndex = -1;
  let currentQuizType = '';

  // --- DOM ELEMENTS ---
  const dashboardView = document.getElementById('dashboard-view');
  const practiceView = document.getElementById('practice-view');
  const questionArea = document.getElementById('question-area');
  const answerArea = document.getElementById('answer-area');
  const knowMoreModal = document.getElementById('know-more-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalText = document.getElementById('modal-text');

  // --- INIT ---
  function initialize() {
    loadProgress();
    Object.keys(vocabulary).forEach(type => {
      vocabulary[type].forEach(word => {
        if (!userProgress[word.id]) {
          const normalizedType = type === 'modalVerbs' ? 'modalVerbs' : (type === 'irregularVerbs' ? 'irregularVerbs' : type);
          userProgress[word.id] = { id: word.id, type: normalizedType, level: word.level, srsLevel: 0, nextReview: new Date() };
        }
      });
    });
    saveProgress();
    updateDashboard();
    addEventListeners();
  }

  // --- SRS ---
  function saveProgress() { localStorage.setItem('deutschWegProgressV2', JSON.stringify(userProgress)); }
  function loadProgress() { userProgress = JSON.parse(localStorage.getItem('deutschWegProgressV2') || '{}'); }
  function getItemsForReview() {
    const now = new Date();
    return Object.values(userProgress).filter(item => new Date(item.nextReview) <= now);
  }
  function updateSRS(wordId, isCorrect) {
    const item = userProgress[wordId];
    const now = new Date();
    if (!item) return;
    if (isCorrect) item.srsLevel = (item.srsLevel || 0) + 1; else item.srsLevel = Math.max(0, (item.srsLevel || 0) - 2);
    const intervals = [0, 4, 8, 24, 72, 168];
    const intervalHours = intervals[Math.min(item.srsLevel, intervals.length - 1)] || 336;
    item.nextReview = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    saveProgress();
  }
  function markAsKnown(wordId) {
    const item = userProgress[wordId];
    if (!item) return;
    item.srsLevel = 4;
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + 30);
    item.nextReview = nextReviewDate;
    saveProgress();
  }
  function findWordData(id) {
    for (const type of Object.keys(vocabulary)) {
      const found = vocabulary[type].find(w => w.id === id);
      if (found) return found;
    }
    return null;
  }

  // --- UI ---
  function updateDashboard() { document.getElementById('review-count').textContent = getItemsForReview().length; }
  function showView(view) {
    dashboardView.classList.add('hidden');
    practiceView.classList.add('hidden');
    view.classList.remove('hidden');
  }

  // --- QUIZ ---
  function startQuiz(quizType) {
    currentQuizType = quizType;
    let itemsToQuiz = [];
    if (quizType === 'review') itemsToQuiz = getItemsForReview();
    else if (quizType.startsWith('flashcard')) itemsToQuiz = Object.values(userProgress);
    else if (quizType.includes('noun')) itemsToQuiz = Object.values(userProgress).filter(p => p.type === 'nouns');
    else if (quizType.includes('verb')) itemsToQuiz = Object.values(userProgress).filter(p => p.type === 'verbs' || p.type === 'irregularVerbs');

    if (itemsToQuiz.length === 0) { alert('No items to practice for this category right now!'); return; }
    currentQuiz = itemsToQuiz.sort(() => Math.random() - 0.5);
    currentQuestionIndex = 0;
    showView(practiceView);
    displayQuestion();
  }

  function displayQuestion() {
    questionArea.innerHTML = '';
    answerArea.innerHTML = '';
    document.getElementById('feedback-message').classList.add('hidden');
    document.getElementById('next-question-btn').classList.add('hidden');

    if (currentQuestionIndex >= currentQuiz.length) { endQuiz(); return; }
    const itemProgress = currentQuiz[currentQuestionIndex];
    const wordData = findWordData(itemProgress.id);
    if (!wordData) { endQuiz(); return; }
    document.getElementById('practice-level').textContent = wordData.level;

    let displayType = currentQuizType;
    if (displayType === 'review') {
      if (itemProgress.type === 'nouns') displayType = Math.random() < 0.5 ? 'noun-gender' : 'noun-plural';
      else if (itemProgress.type === 'verbs' || itemProgress.type === 'irregularVerbs') displayType = Math.random() < 0.5 ? 'verb-conjugation' : 'verb-type';
    }

    const displayMap = {
      'noun-gender': displayNounGenderQuestion,
      'noun-plural': displayNounPluralQuestion,
      'verb-conjugation': displayVerbConjugationQuestion,
      'verb-type': displayVerbTypeQuestion,
      'flashcard-de-en': displayFlashcardQuestion,
      'flashcard-en-de': displayFlashcardQuestion,
    };
    if (displayMap[displayType]) displayMap[displayType](wordData); else questionArea.innerHTML = '<p>Question type not implemented yet.</p>';
  }

  function endQuiz() {
    showView(dashboardView);
    updateDashboard();
    alert('Practice session complete!');
  }

  // --- Question UIs ---
  function displayNounGenderQuestion(wordData) {
    document.getElementById('practice-type').textContent = 'Noun: Gender';
    questionArea.innerHTML = `<p class="text-center text-4xl md:text-5xl font-bold">${wordData.word}</p><p class="text-center text-gray-500 mt-2">What is the gender?</p>`;
    answerArea.innerHTML = `
      <div class="grid grid-cols-3 gap-4">
        <button class="btn btn-der" data-answer="der">der</button>
        <button class="btn btn-die" data-answer="die">die</button>
        <button class="btn btn-das" data-answer="das">das</button>
      </div>`;
    answerArea.querySelector('div').addEventListener('click', e => { if (e.target.tagName === 'BUTTON') checkAnswer(e.target.dataset.answer); });
  }

  function displayNounPluralQuestion(wordData) {
    document.getElementById('practice-type').textContent = 'Noun: Plural';
    questionArea.innerHTML = `<p class="text-center text-3xl md:text-4xl font-semibold">${wordData.article} ${wordData.word}</p><p class="text-center text-gray-500 mt-2">What is the plural form?</p>`;
    answerArea.innerHTML = `
      <div class="flex flex-col items-center">
        <input type="text" id="text-answer-input" class="text-center text-xl p-3 border-2 border-gray-300 rounded-lg w-full md:w-1/2 focus:border-indigo-500" placeholder="Type the plural...">
        <button id="submit-text-answer" class="btn btn-primary mt-4">Check</button>
      </div>`;
    answerArea.querySelector('#submit-text-answer').addEventListener('click', () => checkAnswer(document.getElementById('text-answer-input').value));
  }

  function displayVerbConjugationQuestion(wordData) {
    document.getElementById('practice-type').textContent = 'Verb: Conjugation';
    const pronouns = Object.keys(wordData.conjugation);
    const randomPronoun = pronouns[Math.floor(Math.random() * pronouns.length)];
    const verbWord = wordData.infinitive || wordData.word;
    questionArea.innerHTML = `<p class="text-center text-3xl md:text-4xl font-semibold"><span class="font-bold">${randomPronoun}</span> + <span class="font-bold">${verbWord}</span></p><p class="text-center text-gray-500 mt-2">Conjugate the verb.</p>`;
    answerArea.innerHTML = `
      <div class="flex flex-col items-center">
        <input type="text" id="text-answer-input" class="text-center text-xl p-3 border-2 border-gray-300 rounded-lg w-full md:w-1/2" placeholder="Type the conjugation...">
        <button id="submit-text-answer" class="btn btn-primary mt-4">Check</button>
      </div>`;
    answerArea.querySelector('#submit-text-answer').addEventListener('click', () => checkAnswer(document.getElementById('text-answer-input').value, randomPronoun));
  }

  function displayVerbTypeQuestion(wordData) {
    document.getElementById('practice-type').textContent = 'Verb: Type';
    const verbWord = wordData.infinitive || wordData.word;
    questionArea.innerHTML = `<p class="text-center text-4xl md:text-5xl font-bold">${verbWord}</p><p class="text-center text-gray-500 mt-2">Is this verb regular or irregular?</p>`;
    answerArea.innerHTML = `
      <div class="grid grid-cols-2 gap-4">
        <button class="btn btn-secondary" data-answer="regular">Regular</button>
        <button class="btn btn-secondary" data-answer="irregular">Irregular</button>
      </div>`;
    answerArea.querySelector('div').addEventListener('click', e => { if (e.target.tagName === 'BUTTON') checkAnswer(e.target.dataset.answer); });
  }

  function displayFlashcardQuestion(wordData) {
    const isDeToEn = currentQuizType === 'flashcard-de-en';
    document.getElementById('practice-type').textContent = isDeToEn ? 'Flashcard: DE → EN' : 'Flashcard: EN → DE';
    const germanWord = wordData.infinitive || wordData.word;
    const frontText = isDeToEn ? germanWord : wordData.english;
    const backText = isDeToEn ? wordData.english : germanWord;
    questionArea.innerHTML = `
      <div class="flashcard-container">
        <div class="flashcard">
          <div class="flashcard-face flashcard-front">${frontText}</div>
          <div class="flashcard-face flashcard-back">${backText}</div>
        </div>
      </div>
      <p class="text-center text-sm text-gray-500 mt-4">Click card to flip</p>`;
    answerArea.innerHTML = `
      <div class="grid grid-cols-2 gap-4 mt-4">
        <button class="btn btn-secondary" data-answer="wrong">I didn't know</button>
        <button class="btn btn-primary" data-answer="correct">I knew it!</button>
      </div>`;
    const flashcard = questionArea.querySelector('.flashcard');
    flashcard.addEventListener('click', () => flashcard.classList.toggle('is-flipped'));
    answerArea.querySelector('div').addEventListener('click', e => { if (e.target.tagName === 'BUTTON') checkAnswer(e.target.dataset.answer); });
  }

  // --- Answer Checking ---
  function checkAnswer(userAnswer, context = null) {
    const itemProgress = currentQuiz[currentQuestionIndex];
    const wordData = findWordData(itemProgress.id);
    let isCorrect = false;
    let correctAnswerText = '';
    switch (currentQuizType) {
      case 'noun-gender':
        isCorrect = userAnswer === wordData.article;
        correctAnswerText = `${wordData.article} ${wordData.word}`; break;
      case 'noun-plural':
        isCorrect = userAnswer.trim().toLowerCase() === wordData.plural.toLowerCase();
        correctAnswerText = `die ${wordData.plural}`; break;
      case 'verb-conjugation':
        isCorrect = userAnswer.trim().toLowerCase() === wordData.conjugation[context].toLowerCase();
        correctAnswerText = wordData.conjugation[context]; break;
      case 'verb-type':
        const expectedType = wordData.type || 'irregular';
        isCorrect = userAnswer === expectedType;
        correctAnswerText = `It's ${expectedType}.`; break;
      case 'flashcard-de-en':
      case 'flashcard-en-de':
        isCorrect = userAnswer === 'correct';
        correctAnswerText = isCorrect ? 'Great!' : "No problem, you'll see it again!"; break;
    }
    updateSRS(wordData.id, isCorrect);
    showFeedback(isCorrect, correctAnswerText);
  }

  function showFeedback(isCorrect, text) {
    const feedbackMessageEl = document.getElementById('feedback-message');
    document.getElementById('feedback-text').textContent = isCorrect ? 'Correct!' : `Not quite. The answer is: ${text}`;
    feedbackMessageEl.className = isCorrect ? 'p-4 rounded-lg bg-green-100 text-green-700' : 'p-4 rounded-lg bg-red-100 text-red-700';
    feedbackMessageEl.classList.remove('hidden');
    document.getElementById('next-question-btn').classList.remove('hidden');
    document.getElementById('next-question-btn').focus();
  }

  // --- Modal & listeners ---
  function showKnowMoreModal() {
    const item = currentQuiz[currentQuestionIndex];
    if (!item) return;
    const wordData = findWordData(item.id);
    const title = (wordData && (wordData.infinitive || wordData.word)) || 'Details';
    modalTitle.textContent = title;
    modalText.textContent = (wordData && wordData.details) || 'No details available for this item.';
    knowMoreModal.classList.add('visible');
  }

  function addEventListeners() {
    document.getElementById('start-review-btn').addEventListener('click', () => startQuiz('review'));
    document.querySelectorAll('.module-card').forEach(card => {
      card.addEventListener('click', e => {
        const mod = e.currentTarget.dataset.module;
        const qtype = e.currentTarget.dataset.quizType;
        if (mod === 'modal-verbs') { showView(practiceView); openModalVerbsMenu(); }
        else if (mod === 'irregular-verbs') { showView(practiceView); openIrregularVerbsMenu(); }
        else if (qtype) startQuiz(qtype);
        else if (mod) startQuiz(mod);
      });
    });
    document.getElementById('exit-practice-btn').addEventListener('click', endQuiz);
    document.getElementById('next-question-btn').addEventListener('click', () => displayQuestion(++currentQuestionIndex));
    document.getElementById('i-know-this-btn').addEventListener('click', () => {
      if (currentQuestionIndex !== -1 && currentQuiz[currentQuestionIndex]) { markAsKnown(currentQuiz[currentQuestionIndex].id); displayQuestion(++currentQuestionIndex); }
    });
    document.getElementById('know-more-btn').addEventListener('click', showKnowMoreModal);
    document.getElementById('close-modal-btn').addEventListener('click', () => knowMoreModal.classList.remove('visible'));
  }

  // --- Normalization helpers for quizzes ---
  const normalizeText = s => (s||'').toLowerCase().replace(/[\p{P}\p{S}]/gu, '').trim();
  const normalizeGerman = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  const words = s => (s||'').split(/\s+/).filter(Boolean);
  function isMeaningMatch(userRaw, acceptedArr) {
    if (!userRaw || !acceptedArr) return false;
    const user = normalizeText(userRaw);
    for (const acc of acceptedArr) {
      const accNorm = normalizeText(acc);
      if (user === accNorm) return true;
      if (user.includes(accNorm)) return true;
      if (accNorm.includes(user)) return true;
      const userWords = new Set(words(user));
      const accWords = words(accNorm);
      const common = accWords.filter(w => userWords.has(w)).length;
      if (accWords.length > 0 && (common / accWords.length) >= 0.5) return true;
    }
    return false;
  }
  function isSpellingMatch(userRaw, correct) {
    const u = normalizeGerman(userRaw);
    const c = normalizeGerman(correct);
    if (!u || !c) return false;
    if (u === c) return true;
    if (u.replace(/e/g,'') === c.replace(/e/g,'')) return true;
    const alt = c.replace(/oe/g,'o').replace(/ae/g,'a').replace(/ue/g,'u');
    if (u === alt) return true;
    return false;
  }
  function isTranslationMatch(userRaw, correctRaw) {
    const u = normalizeGerman(userRaw);
    const c = normalizeGerman(correctRaw);
    if (!u || !c) return false;
    if (u === c) return true;
    if (u.includes(c) || c.includes(u)) return true;
    const uWords = new Set(words(u));
    const cWords = words(c);
    const common = cWords.filter(w => uWords.has(w)).length;
    if (cWords.length > 0 && (common / cWords.length) >= 0.5) return true;
    return false;
  }

  // --- Modal Verbs minimal UI (reuse text-only info/list/quiz quick stubs) ---
  function openModalVerbsMenu() {
    const practiceTypeEl = document.getElementById('practice-type');
    if (practiceTypeEl) practiceTypeEl.textContent = 'Modal Verbs';
    questionArea.innerHTML = `
      <div class='space-y-4'>
        <button class='btn btn-secondary w-full' id='modal-back-to-dashboard'>Back to Dashboard</button>
        <button class='btn btn-primary w-full' id='btn-modal-info'>Comprehensive Info</button>
        <button class='btn btn-primary w-full' id='btn-modal-list'>List of Modal Verbs</button>
        <button class='btn btn-primary w-full' id='btn-modal-quiz'>Quizzes</button>
      </div>`;
    answerArea.innerHTML = '';
    document.getElementById('modal-back-to-dashboard').addEventListener('click', () => showView(dashboardView));
    document.getElementById('btn-modal-info').addEventListener('click', showModalVerbsInfo);
    document.getElementById('btn-modal-list').addEventListener('click', showModalVerbsList);
    document.getElementById('btn-modal-quiz').addEventListener('click', showModalVerbsQuizMenu);
  }
  function showModalVerbsInfo() {
    const practiceTypeEl = document.getElementById('practice-type');
    if (practiceTypeEl) practiceTypeEl.textContent = 'Modal Verbs - Comprehensive Info';
    questionArea.innerHTML = `
      <button class='btn btn-secondary mb-4' id='modal-back-to-menu'>Back</button>
      <h2 class='text-lg font-bold mb-4'>Modal Verbs — Overview & Usage (A1–A2)</h2>
      <p class='mb-2'>Modal verbs modify the meaning of a main verb and are followed by an infinitive at the clause end.</p>`;
    answerArea.innerHTML = '';
    document.getElementById('modal-back-to-menu').addEventListener('click', openModalVerbsMenu);
  }
  function showModalVerbsList() {
    const practiceTypeEl = document.getElementById('practice-type');
    if (practiceTypeEl) practiceTypeEl.textContent = 'Modal Verbs - List';
    let html = `
      <button class='btn btn-secondary mb-4' id='modal-back-to-menu-2'>Back</button>
      <h2 class="text-lg font-bold mb-4">Modal Verbs — Conjugation & Examples</h2>
      <div style='overflow:auto'><table><thead><tr>
        <th>Infinitive</th><th>English</th><th>ich</th><th>du</th><th>er/sie/es</th><th>wir</th><th>ihr</th><th>sie/Sie</th><th>Example</th></tr></thead><tbody>`;
    vocabulary.modalVerbs.forEach(v => {
      html += `<tr><td><strong>${v.infinitive}</strong></td><td>${v.english}</td><td>${v.conjugation['ich']}</td><td>${v.conjugation['du']}</td><td>${v.conjugation['er/sie/es']}</td><td>${v.conjugation['wir']}</td><td>${v.conjugation['ihr']}</td><td>${v.conjugation['sie/Sie']}</td><td>${v.example.de}</td></tr>`;
    });
    html += '</tbody></table></div>';
    questionArea.innerHTML = html; answerArea.innerHTML = '';
    document.getElementById('modal-back-to-menu-2').addEventListener('click', openModalVerbsMenu);
  }
  function showModalVerbsQuizMenu() {
    const practiceTypeEl = document.getElementById('practice-type');
    if (practiceTypeEl) practiceTypeEl.textContent = 'Modal Verbs - Quizzes';
    questionArea.innerHTML = `
      <div class='space-y-3'>
        <button class='btn btn-secondary w-full' id='modal-back-to-menu-3'>Back</button>
        <button class='btn btn-primary w-full' id='quiz-meaning'>Test: English meaning (DE → EN)</button>
      </div>`;
    answerArea.innerHTML = '';
    document.getElementById('modal-back-to-menu-3').addEventListener('click', openModalVerbsMenu);
    document.getElementById('quiz-meaning').addEventListener('click', () => startModalQuiz('meaning'));
  }
  let modalQuizIndex = 0; let modalQuizMode = null;
  function startModalQuiz(mode) { modalQuizMode = mode; modalQuizIndex = 0; askModalVerbQuestion(); }
  function askModalVerbQuestion() {
    const v = vocabulary.modalVerbs[modalQuizIndex]; if (!v) { questionArea.innerHTML = '<p>No modal verbs available.</p>'; answerArea.innerHTML = ''; return; }
    const backBtnHtml = `<button class='btn btn-secondary mb-3' id='modal-back-to-quiz-menu'>Back</button>`;
    if (modalQuizMode === 'meaning') {
      questionArea.innerHTML = backBtnHtml + `<p class='mb-4 text-xl'>What is the English meaning of <strong>${v.infinitive}</strong>?</p>`;
      answerArea.innerHTML = `<input id='quizAns' class='p-2 border rounded w-full' placeholder='Type the English meaning...'><div class='mt-2 flex gap-2'><button class='btn btn-primary' id='check-btn'>Check</button><button class='btn btn-secondary' id='skip-btn'>Skip</button></div>`;
      document.getElementById('check-btn').addEventListener('click', checkModalVerbAnswer);
      document.getElementById('skip-btn').addEventListener('click', () => modalNext());
    }
    const backToMenuBtn = document.getElementById('modal-back-to-quiz-menu'); if (backToMenuBtn) backToMenuBtn.addEventListener('click', showModalVerbsQuizMenu);
  }
  function checkModalVerbAnswer() {
    const v = vocabulary.modalVerbs[modalQuizIndex]; const ansEl = document.getElementById('quizAns'); if (!ansEl) return; const user = ansEl.value.trim();
    const correct = isMeaningMatch(user, v.acceptedMeanings || [v.english]); const correctText = v.english;
    if (correct) { answerArea.innerHTML = `<div class='p-4 bg-green-100 rounded'>✅ Correct! <button class='btn btn-primary ml-2' id='next-btn'>Next</button></div>`; document.getElementById('next-btn').addEventListener('click', () => modalNext(true)); }
    else {
      answerArea.innerHTML = `<div class='p-4 bg-red-100 rounded'>❌ Not quite. Correct: <strong>${correctText}</strong><div class='mt-3'><button class='btn btn-primary ml-2' id='next-btn'>Next</button></div></div>`;
      document.getElementById('next-btn').addEventListener('click', () => modalNext(false));
    }
  }
  function modalNext(wasCorrect) { const v = vocabulary.modalVerbs[modalQuizIndex]; if (v && userProgress[v.id]) updateSRS(v.id, !!wasCorrect); modalQuizIndex = (modalQuizIndex + 1) % vocabulary.modalVerbs.length; askModalVerbQuestion(); }

  // --- Irregular verbs stubs (reuse existing flows) ---
  let irregularQuizIndex = 0; let irregularQuizMode = null;
  function openIrregularVerbsMenu() {
    const practiceTypeEl = document.getElementById('practice-type'); if (practiceTypeEl) practiceTypeEl.textContent = 'Irregular Verbs';
    questionArea.innerHTML = `
      <div class='space-y-4'>
        <button class='btn btn-secondary w-full' id='irregular-back-to-dashboard'>Back to Dashboard</button>
        <button class='btn btn-primary w-full' id='btn-irregular-info'>Comprehensive Info</button>
        <button class='btn btn-primary w-full' id='btn-irregular-list'>List of Irregular Verbs</button>
        <button class='btn btn-primary w-full' id='btn-irregular-quiz'>Interactive Quizzes</button>
      </div>`;
    answerArea.innerHTML = '';
    document.getElementById('irregular-back-to-dashboard').addEventListener('click', () => showView(dashboardView));
    document.getElementById('btn-irregular-info').addEventListener('click', showIrregularVerbsInfo);
    document.getElementById('btn-irregular-list').addEventListener('click', showIrregularVerbsList);
    document.getElementById('btn-irregular-quiz').addEventListener('click', showIrregularVerbsQuizMenu);
  }
  function showIrregularVerbsInfo() {
    const practiceTypeEl = document.getElementById('practice-type'); if (practiceTypeEl) practiceTypeEl.textContent = 'Irregular Verbs - Comprehensive Info';
    questionArea.innerHTML = `
      <button class='btn btn-secondary mb-4' id='irregular-back-to-menu'>Back</button>
      <h2 class='text-lg font-bold mb-4'>Irregular Verbs — Overview & Patterns (A1–A2)</h2>
      <p class='mb-2'>Irregular verbs often change their stem or past forms. Learn patterns and high-frequency verbs first.</p>`;
    answerArea.innerHTML = '';
    document.getElementById('irregular-back-to-menu').addEventListener('click', openIrregularVerbsMenu);
  }
  function showIrregularVerbsList() {
    const practiceTypeEl = document.getElementById('practice-type'); if (practiceTypeEl) practiceTypeEl.textContent = 'Irregular Verbs - Complete List';
    const a1Verbs = vocabulary.irregularVerbs.filter(v => v.level === 'A1');
    const a2Verbs = vocabulary.irregularVerbs.filter(v => v.level === 'A2');
    let html = `<button class='btn btn-secondary mb-4' id='irregular-back-to-menu-2'>Back</button><h2 class="text-lg font-bold mb-4">Irregular Verbs — List</h2>`;
    const renderTable = (title, list) => {
      let t = `<h3 class='text-md font-bold mb-3'>${title}</h3><div style='overflow:auto'><table><thead><tr><th>Infinitive</th><th>English</th><th>ich</th><th>du</th><th>er/sie/es</th><th>wir</th><th>ihr</th><th>sie/Sie</th><th>Partizip II</th><th>Aux</th></tr></thead><tbody>`;
      list.forEach(v => { t += `<tr><td><strong>${v.infinitive}</strong></td><td>${v.english}</td><td>${v.conjugation['ich']}</td><td>${v.conjugation['du']}</td><td>${v.conjugation['er/sie/es']}</td><td>${v.conjugation['wir']}</td><td>${v.conjugation['ihr']}</td><td>${v.conjugation['sie/Sie']}</td><td>${v.partizipII}</td><td>${v.perfectAux}</td></tr>`; });
      return t + '</tbody></table></div>';
    };
    html += renderTable('A1', a1Verbs) + renderTable('A2', a2Verbs);
    questionArea.innerHTML = html; answerArea.innerHTML = '';
    document.getElementById('irregular-back-to-menu-2').addEventListener('click', openIrregularVerbsMenu);
  }
  function showIrregularVerbsQuizMenu() {
    const practiceTypeEl = document.getElementById('practice-type'); if (practiceTypeEl) practiceTypeEl.textContent = 'Irregular Verbs - Interactive Quizzes';
    questionArea.innerHTML = `
      <div class='space-y-3'>
        <button class='btn btn-secondary w-full' id='irregular-back-to-menu-3'>Back</button>
        <button class='btn btn-primary w-full' id='quiz-irregular-meaning'>English Meaning (DE → EN)</button>
        <button class='btn btn-primary w-full' id='quiz-irregular-conjugation'>Present Conjugation</button>
        <button class='btn btn-primary w-full' id='quiz-irregular-partizip'>Partizip II Forms</button>
        <button class='btn btn-primary w-full' id='quiz-irregular-perfect'>Perfect Tense Formation</button>
      </div>`;
    answerArea.innerHTML = '';
    document.getElementById('irregular-back-to-menu-3').addEventListener('click', openIrregularVerbsMenu);
    document.getElementById('quiz-irregular-meaning').addEventListener('click', () => startIrregularQuiz('meaning'));
    document.getElementById('quiz-irregular-conjugation').addEventListener('click', () => startIrregularQuiz('conjugation'));
    document.getElementById('quiz-irregular-partizip').addEventListener('click', () => startIrregularQuiz('partizip'));
    document.getElementById('quiz-irregular-perfect').addEventListener('click', () => startIrregularQuiz('perfect'));
  }
  function startIrregularQuiz(mode) { irregularQuizMode = mode; irregularQuizIndex = 0; askIrregularVerbQuestion(); }
  function askIrregularVerbQuestion() {
    const v = vocabulary.irregularVerbs[irregularQuizIndex]; if (!v) { questionArea.innerHTML = '<p>No irregular verbs available.</p>'; answerArea.innerHTML = ''; return; }
    const backBtnHtml = `<button class='btn btn-secondary mb-3' id='irregular-back-to-quiz-menu'>Back to Quiz Menu</button>`;
    const skipNextHtml = `<div class='mt-2 flex gap-2'><button class='btn btn-primary' id='check-btn'>Check</button><button class='btn btn-secondary' id='skip-btn'>Skip</button></div>`;
    if (irregularQuizMode === 'meaning') {
      questionArea.innerHTML = backBtnHtml + `<p class='mb-2 text-sm text-gray-600'>Level: ${v.level}</p><p class='mb-4 text-xl'>What is the English meaning of <strong>${v.infinitive}</strong>?</p>`;
      answerArea.innerHTML = `<input id='irregularAns' class='p-2 border rounded w-full' placeholder='Type the English meaning...'>${skipNextHtml}`;
    } else if (irregularQuizMode === 'conjugation') {
      const pronouns = Object.keys(v.conjugation); const randomPronoun = pronouns[Math.floor(Math.random()*pronouns.length)];
      questionArea.innerHTML = backBtnHtml + `<p class='mb-2 text-sm text-gray-600'>Level: ${v.level}</p><p class='mb-4 text-xl'>Conjugate: <strong>${randomPronoun}</strong> + <strong>${v.infinitive}</strong></p>`;
      answerArea.innerHTML = `<input id='irregularAns' class='p-2 border rounded w-full' placeholder='Type the conjugated form...' data-pronoun='${randomPronoun}'>${skipNextHtml}`;
    } else if (irregularQuizMode === 'partizip') {
      questionArea.innerHTML = backBtnHtml + `<p class='mb-2 text-sm text-gray-600'>Level: ${v.level}</p><p class='mb-4 text-xl'>What is the Partizip II of <strong>${v.infinitive}</strong>?</p>`;
      answerArea.innerHTML = `<input id='irregularAns' class='p-2 border rounded w-full' placeholder='Type the Partizip II...'>${skipNextHtml}`;
    } else if (irregularQuizMode === 'perfect') {
      const person = Math.random() < 0.5 ? 'ich' : 'du'; const auxForm = person === 'ich' ? (v.perfectAux === 'sein' ? 'bin' : 'habe') : (v.perfectAux === 'sein' ? 'bist' : 'hast');
      questionArea.innerHTML = backBtnHtml + `<p class='mb-2 text-sm text-gray-600'>Level: ${v.level}</p><p class='mb-4 text-xl'>Form perfect tense: <strong>${person}</strong> + <strong>${v.infinitive}</strong></p><p class='mb-2 text-sm text-gray-500'>Format: ${person} + auxiliary + partizip</p>`;
      answerArea.innerHTML = `<input id='irregularAns' class='p-2 border rounded w-full' placeholder='e.g., ich habe gegessen' data-person='${person}' data-aux='${auxForm}'>${skipNextHtml}`;
    }
    document.getElementById('check-btn').addEventListener('click', checkIrregularVerbAnswer);
    document.getElementById('skip-btn').addEventListener('click', () => irregularNext());
    const backToMenuBtn = document.getElementById('irregular-back-to-quiz-menu'); if (backToMenuBtn) backToMenuBtn.addEventListener('click', showIrregularVerbsQuizMenu);
  }
  function checkIrregularVerbAnswer() {
    const v = vocabulary.irregularVerbs[irregularQuizIndex]; const ansEl = document.getElementById('irregularAns'); if (!ansEl) return; const user = ansEl.value.trim();
    let correct = false; let correctText = '';
    if (irregularQuizMode === 'meaning') { correctText = v.english; correct = isMeaningMatch(user, v.acceptedMeanings || [v.english]); }
    else if (irregularQuizMode === 'conjugation') { const pronoun = ansEl.dataset.pronoun; correctText = v.conjugation[pronoun]; correct = normalizeGerman(user) === normalizeGerman(correctText); }
    else if (irregularQuizMode === 'partizip') { correctText = v.partizipII; correct = normalizeGerman(user) === normalizeGerman(correctText); }
    else if (irregularQuizMode === 'perfect') { const person = ansEl.dataset.person; const aux = ansEl.dataset.aux; correctText = `${person} ${aux} ${v.partizipII}`; const userNorm = normalizeGerman(user); const correctNorm = normalizeGerman(correctText); correct = userNorm === correctNorm || (userNorm.includes(normalizeGerman(aux)) && userNorm.includes(normalizeGerman(v.partizipII))); }
    if (correct) { answerArea.innerHTML = `<div class='p-4 bg-green-100 rounded'>✅ Correct! <button class='btn btn-primary ml-2' id='next-btn'>Next</button></div>`; document.getElementById('next-btn').addEventListener('click', () => irregularNext(true)); }
    else { answerArea.innerHTML = `<div class='p-4 bg-red-100 rounded'>❌ Not quite. Correct: <strong>${correctText}</strong><div class='mt-3'><button class='btn btn-primary ml-2' id='next-btn'>Next</button></div></div>`; document.getElementById('next-btn').addEventListener('click', () => irregularNext(false)); }
  }
  function irregularNext(wasCorrect) { const v = vocabulary.irregularVerbs[irregularQuizIndex]; if (v && userProgress[v.id]) updateSRS(v.id, !!wasCorrect); irregularQuizIndex = (irregularQuizIndex + 1) % vocabulary.irregularVerbs.length; askIrregularVerbQuestion(); }

  // Go!
  initialize();
});


