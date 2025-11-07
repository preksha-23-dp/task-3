// ====== SAMPLE QUESTIONS ======
// type: "single" -> one correct (answer is string index or value)
// type: "multiple" -> multiple correct (answer is array of indices or values)
// type: "fill" -> fill-in-the-blank (answer is string or array of acceptable answers)
const questions = [
  {
    id: 1,
    type: "single",
    question: "Which language runs in the browser?",
    options: ["Python", "C++", "JavaScript", "Java"],
    answer: 2, // index of "JavaScript"
    explanation: "JavaScript is the language supported natively by browsers."
  },
  {
    id: 2,
    type: "multiple",
    question: "Select all HTML semantic tags below:",
    options: ["<div>", "<section>", "<header>", "<span>", "<footer>"],
    answer: [1,2,4], // indices of section, header, footer
    explanation: "section, header and footer are semantic elements; div/span are generic."
  },
  {
    id: 3,
    type: "fill",
    question: "Fill in the blank: The CSS property used to change text color is ____.",
    answer: ["color"], // acceptable answers (case-insensitive)
    explanation: "The 'color' property changes the text color in CSS."
  },
  {
    id: 4,
    type: "single",
    question: "What does DOM stand for?",
    options: ["Document Object Model", "Display Object Model", "Digital Output Model"],
    answer: 0,
    explanation: "DOM stands for Document Object Model."
  },
  {
    id: 5,
    type: "multiple",
    question: "Which of these are JavaScript data types?",
    options: ["String", "Boolean", "Number", "Class", "Undefined"],
    answer: [0,1,2,4],
    explanation: "String, Boolean, Number and Undefined are primitive types in JS."
  }
];

// ====== STATE ======
let currentIndex = 0;
let userAnswers = []; // store user answer objects {qId, value, correct}
let score = 0;

// DOM refs
const questionArea = document.getElementById("question-area");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const feedbackEl = document.getElementById("feedback");
const progressBar = document.getElementById("progress-bar");
const resultCard = document.getElementById("result");
const quizContainer = document.getElementById("quiz-container");
const scoreText = document.getElementById("score-text");
const detailedResult = document.getElementById("detailed-result");
const restartBtn = document.getElementById("restartBtn");

// ====== UTIL ======
function setProgress() {
  const percent = ((currentIndex) / questions.length) * 100;
  progressBar.style.width = `${percent}%`;
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

// ====== RENDERING ======
function renderQuestion() {
  const q = questions[currentIndex];
  feedbackEl.className = "feedback hidden";
  feedbackEl.textContent = "";

  // header + meta
  let html = `<h2>Q${currentIndex + 1}. ${escapeHtml(q.question)}</h2>`;
  html += `<div class="question-meta">Type: ${q.type.toUpperCase()}</div>`;

  // prepare saved answer (if any)
  const saved = userAnswers.find(u => u.qId === q.id);

  // render by type
  if (q.type === "single" || q.type === "multiple") {
    html += `<div class="options">`;
    q.options.forEach((opt, i) => {
      // input type
      const inputType = q.type === "single" ? "radio" : "checkbox";
      // input name (group radios)
      const nameAttr = `opt-${q.id}`;
      // checked if saved
      let checked = "";
      if (saved) {
        if (q.type === "single" && saved.value === i) checked = "checked";
        if (q.type === "multiple" && Array.isArray(saved.value) && saved.value.includes(i)) checked = "checked";
      }
      html += `
        <label class="option" data-index="${i}">
          <input type="${inputType}" name="${nameAttr}" value="${i}" ${checked} />
          <span class="option-label">${escapeHtml(opt)}</span>
        </label>
      `;
    });
    html += `</div>`;
  } else if (q.type === "fill") {
    const val = saved && typeof saved.value === "string" ? saved.value : "";
    html += `
      <div class="options">
        <label class="option"><input id="fill-input" type="text" placeholder="Type your answer..." value="${escapeAttr(val)}" style="flex:1;padding:8px;border:1px solid #e6eefc;border-radius:6px" /></label>
      </div>
    `;
  }

  questionArea.innerHTML = html;

  // manage buttons
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === questions.length - 1;
  // progress
  setProgress();
}

// ====== ESCAPE HELPERS ======
function escapeHtml(str){
  return String(str || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
function escapeAttr(str){
  return String(str || "").replaceAll('"','&quot;');
}

// ====== EVALUATION ======
function evaluateCurrent() {
  const q = questions[currentIndex];
  let userValue;

  if (q.type === "single") {
    const input = questionArea.querySelector('input[type="radio"]:checked');
    if (!input) return { ok:false, msg:"Please select an option."};
    userValue = Number(input.value);
    const correct = userValue === q.answer;
    return { ok:true, value:userValue, correct, explanation:q.explanation };
  }

  if (q.type === "multiple") {
    const inputs = Array.from(questionArea.querySelectorAll('input[type="checkbox"]'));
    const checked = inputs.filter(i => i.checked).map(i => Number(i.value));
    if (checked.length === 0) return { ok:false, msg:"Select at least one option." };
    // compare sets
    const expected = Array.isArray(q.answer) ? q.answer.slice().sort() : [q.answer];
    const given = checked.slice().sort();
    const correct = arraysEqual(expected, given);
    return { ok:true, value:given, correct, explanation:q.explanation };
  }

  if (q.type === "fill") {
    const input = questionArea.querySelector('#fill-input');
    const text = input ? input.value.trim() : "";
    if (text === "") return { ok:false, msg:"Please type an answer." };
    // accept multiple forms, compare lowercase trimmed
    const expected = Array.isArray(q.answer) ? q.answer : [q.answer];
    const match = expected.some(a => String(a).trim().toLowerCase() === text.toLowerCase());
    return { ok:true, value:text, correct:match, explanation:q.explanation };
  }

  return { ok:false, msg:"Unknown question type" };
}

function arraysEqual(a,b){
  if(a.length !== b.length) return false;
  for(let i=0;i<a.length;i++) if(a[i] !== b[i]) return false;
  return true;
}

// ====== SUBMIT / NAV HANDLERS ======
submitBtn.addEventListener('click', () => {
  const res = evaluateCurrent();
  if (!res.ok) {
    showFeedback(res.msg, "incorrect");
    return;
  }

  // mark saved (replace if exists)
  const qId = questions[currentIndex].id;
  const prevIndex = userAnswers.findIndex(u => u.qId === qId);
  const entry = { qId, value: res.value, correct: !!res.correct };
  if (prevIndex >= 0) userAnswers[prevIndex] = entry;
  else userAnswers.push(entry);

  // update score (recompute)
  computeScore();

  // show feedback
  if (res.correct) {
    showFeedback("Correct ✔️ — " + (res.explanation || ""), "correct");
  } else {
    // reveal correct answer text
    const correctText = getCorrectText(questions[currentIndex]);
    showFeedback("Incorrect ✖️ — correct: " + correctText + " — " + (res.explanation || ""), "incorrect");
  }
});

prevBtn.addEventListener('click', () => {
  if (currentIndex === 0) return;
  currentIndex--;
  renderQuestion();
});

nextBtn.addEventListener('click', () => {
  if (currentIndex === questions.length - 1) return;
  currentIndex++;
  renderQuestion();
});

// ====== FEEDBACK UI ======
function showFeedback(text, type) {
  feedbackEl.className = "feedback " + (type === "correct" ? "correct" : "incorrect");
  feedbackEl.textContent = text;
  // auto-hide after few seconds
  setTimeout(() => {
    feedbackEl.className = "feedback hidden";
  }, 4000);
}

// ====== SCORE / RESULTS ======
function computeScore() {
  score = userAnswers.reduce((sum, a) => sum + (a.correct ? 1 : 0), 0);
}

function getCorrectText(q) {
  if (q.type === "single") return q.options[q.answer];
  if (q.type === "multiple") return q.answer.map(i => q.options[i]).join(", ");
  if (q.type === "fill") return Array.isArray(q.answer) ? q.answer.join(" / ") : q.answer;
  return "";
}

// show final results
function showResults() {
  computeScore();
  quizContainer.classList.add("hidden");
  resultCard.classList.remove("hidden");
  scoreText.textContent = `You scored ${score} out of ${questions.length} (${Math.round((score/questions.length)*100)}%)`;

  // detailed results
  detailedResult.innerHTML = "";
  questions.forEach(q => {
    const user = userAnswers.find(u => u.qId === q.id);
    const isCorrect = user ? user.correct : false;
    const userVal = user ? user.value : null;
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML = `<strong>${escapeHtml(q.question)}</strong>
      <div style="margin-top:6px">Your answer: <em>${formatUserAnswer(q,userVal)}</em></div>
      <div>Correct: <em>${escapeHtml(getCorrectText(q))}</em></div>
      <div style="margin-top:6px;color:${isCorrect?'var(--success)':'var(--danger)'}">${isCorrect?'Correct':'Incorrect'}</div>`;
    detailedResult.appendChild(item);
  });
}

function formatUserAnswer(q,val) {
  if (!val && val !== 0) return "<span style='color:var(--muted)'>No answer</span>";
  if (q.type === "single") return escapeHtml(q.options[val]);
  if (q.type === "multiple") return val.map(i => escapeHtml(q.options[i])).join(", ");
  return escapeHtml(val);
}

// restart
restartBtn.addEventListener('click', () => {
  currentIndex = 0;
  userAnswers = [];
  score = 0;
  resultCard.classList.add("hidden");
  quizContainer.classList.remove("hidden");
  renderQuestion();
});

// keyboard: Enter to submit, Arrow keys to navigate
window.addEventListener('keydown', (e) => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text') {
    if (e.key === 'Enter') {
      submitBtn.click();
      e.preventDefault();
    }
    return;
  }
  if (e.key === 'ArrowRight') nextBtn.click();
  if (e.key === 'ArrowLeft') prevBtn.click();
  if (e.key === 'Enter') submitBtn.click();
  if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
    // ctrl/cmd + s to show results (handy)
    e.preventDefault();
    showResults();
  }
});

// ====== INIT ======
renderQuestion();

// Expose results by pressing finish (if user reaches last question and wants final)
nextBtn.addEventListener('click', () => {
  if (currentIndex === questions.length - 1) {
    // when reaching last question, you may want to finish
  }
});

// add a finish on double-click of progress bar (handy)
progressBar.parentElement.addEventListener('dblclick', () => {
  showResults();
});
