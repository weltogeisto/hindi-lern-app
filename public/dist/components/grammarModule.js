// src/components/grammarModule.ts
// Grammar module: renders the grammar lessons tab with lessons + exercises
import { playHindi } from '../utils/audioPlayer.js';
const GRAMMAR_SRS_KEY = 'hindi_grammar_srs_v1';
function loadGrammarProgress() {
    try {
        const raw = localStorage.getItem(GRAMMAR_SRS_KEY);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
function saveGrammarProgress(progress) {
    try {
        localStorage.setItem(GRAMMAR_SRS_KEY, JSON.stringify(progress));
    }
    catch { /* ignore */ }
}
export async function renderGrammarTab(container) {
    let lessons = [];
    try {
        const res = await fetch('data/grammar.json');
        lessons = await res.json();
    }
    catch {
        container.innerHTML = '<div class="vocab-empty">We couldn’t load grammar lessons. Refresh the page to retry.</div>';
        return;
    }
    const progress = loadGrammarProgress();
    renderLessonList(container, lessons, progress);
}
function renderLessonList(container, lessons, progress) {
    const a1 = lessons.filter(l => l.level === 'A1');
    const a2 = lessons.filter(l => l.level === 'A2');
    const completedCount = lessons.filter(l => progress[l.id]?.completed).length;
    const renderGroup = (group, levelLabel) => `
        <div class="grammar-level-group">
            <div class="grammar-level-badge level-${levelLabel.toLowerCase()}">${levelLabel}</div>
            ${group.map(lesson => {
        const done = progress[lesson.id]?.completed ?? false;
        const score = progress[lesson.id]?.score ?? 0;
        return `
                    <button class="grammar-lesson-card ${done ? 'done' : ''}" data-lesson-id="${lesson.id}" aria-label="Open lesson: ${lesson.title}">
                        <div class="grammar-lesson-header">
                            <span class="grammar-lesson-title">${lesson.title}</span>
                            <span class="grammar-lesson-check">${done ? `✅ ${score}%` : '▶'}</span>
                        </div>
                        <div class="grammar-lesson-preview">${lesson.explanation.substring(0, 90)}…</div>
                    </button>
                `;
    }).join('')}
        </div>
    `;
    container.innerHTML = `
        <section class="app-card app-card--accent grammar-hero">
            <h1 class="hero-title">Hindi Grammar</h1>
            <p class="hero-subtitle">12 A1–A2 lessons covering script, structure, tenses and more.</p>
            <div class="grammar-overall-progress">
                <div class="progress-label"><span>Lessons completed</span><span>${completedCount} / ${lessons.length}</span></div>
                <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${Math.round(completedCount / Math.max(1, lessons.length) * 100)}%"></div></div>
            </div>
        </section>
        <div class="grammar-lessons-list" id="grammar-list">
            ${renderGroup(a1, 'A1')}
            ${renderGroup(a2, 'A2')}
        </div>
    `;
    container.querySelectorAll('.grammar-lesson-card').forEach(btn => {
        btn.addEventListener('click', () => {
            const lessonId = btn.dataset.lessonId;
            const lesson = lessons.find(l => l.id === lessonId);
            if (lesson)
                renderLesson(container, lesson, lessons, progress);
        });
    });
}
function renderLesson(container, lesson, allLessons, progress) {
    const examplesHtml = lesson.examples.map(ex => `
        <div class="grammar-example-row">
            <button class="grammar-play-btn" data-hindi="${ex.hindi}" title="Hear pronunciation">🔊</button>
            <div class="grammar-example-content">
                <div class="grammar-example-hindi">${ex.hindi}</div>
                <div class="grammar-example-translit">${ex.transliteration}</div>
                <div class="grammar-example-english">${ex.english}</div>
            </div>
        </div>
    `).join('');
    container.innerHTML = `
        <div class="grammar-lesson-view">
            <button class="grammar-back-btn" id="grammar-back">← All Lessons</button>
            <div class="grammar-lesson-level-badge level-${lesson.level.toLowerCase()}">${lesson.level}</div>
            <h2 class="grammar-lesson-title-large">${lesson.title}</h2>

            <section class="app-card grammar-explanation-panel">
                <h3>Explanation</h3>
                <p class="grammar-explanation-text">${lesson.explanation}</p>
            </section>

            <section class="app-card grammar-examples-panel">
                <h3>Examples</h3>
                ${examplesHtml}
            </section>

            <section class="app-card grammar-exercises-panel" id="grammar-exercises">
                <h3>Practice Exercises</h3>
                <div id="exercise-area"></div>
            </section>
        </div>
    `;
    container.querySelector('#grammar-back')?.addEventListener('click', () => {
        renderLessonList(container, allLessons, loadGrammarProgress());
    });
    container.querySelectorAll('.grammar-play-btn').forEach(btn => {
        btn.addEventListener('click', () => playHindi(btn.dataset.hindi ?? ''));
    });
    startExercises(container.querySelector('#exercise-area'), lesson, progress);
}
function startExercises(area, lesson, progress) {
    let current = 0;
    let correct = 0;
    const exercises = lesson.exercises;
    const showExercise = () => {
        if (current >= exercises.length) {
            const pct = Math.round((correct / exercises.length) * 100);
            progress[lesson.id] = { completed: true, score: pct };
            saveGrammarProgress(progress);
            area.innerHTML = `
                <div class="exercise-complete">
                    <div class="exercise-score">${correct} / ${exercises.length} correct — ${pct}%</div>
                    <p>${pct >= 70 ? '🎉 Great work — lesson complete. Choose another lesson to keep momentum.' : '📖 Review the explanation above, then tap Try Again to improve your score.'}</p>
                    <button class="exercise-retry-btn" id="retry-btn">Try Again</button>
                </div>
            `;
            area.querySelector('#retry-btn')?.addEventListener('click', () => {
                current = 0;
                correct = 0;
                showExercise();
            });
            return;
        }
        const ex = exercises[current];
        const shuffled = [...ex.options].sort(() => Math.random() - 0.5);
        area.innerHTML = `
            <div class="exercise-card">
                <div class="exercise-counter">${current + 1} / ${exercises.length}</div>
                <div class="exercise-question">${ex.question}</div>
                <div class="exercise-options">
                    ${shuffled.map((opt, i) => `
                        <button class="exercise-option" data-option="${opt}" data-index="${i}">${opt}</button>
                    `).join('')}
                </div>
                <div id="exercise-feedback" class="exercise-feedback"></div>
            </div>
        `;
        let answered = false;
        area.querySelectorAll('.exercise-option').forEach(btn => {
            btn.addEventListener('click', () => {
                if (answered)
                    return;
                answered = true;
                const chosen = btn.dataset.option ?? '';
                const isRight = chosen === ex.answer;
                if (isRight)
                    correct++;
                area.querySelectorAll('.exercise-option').forEach(b => {
                    b.disabled = true;
                    if (b.dataset.option === ex.answer)
                        b.classList.add('correct');
                    else if (b === btn && !isRight)
                        b.classList.add('incorrect');
                });
                const fb = area.querySelector('#exercise-feedback');
                if (fb) {
                    fb.textContent = isRight ? '✓ Correct.' : `✗ Not yet. Correct answer: ${ex.answer}`;
                    fb.className = `exercise-feedback ${isRight ? 'feedback-correct' : 'feedback-wrong'}`;
                }
                setTimeout(() => {
                    current++;
                    showExercise();
                }, 1400);
            });
        });
    };
    showExercise();
}
