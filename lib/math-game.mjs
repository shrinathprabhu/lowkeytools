// Self-contained so even a wildcard 404 can play without fetching another app.
export const mathGameHTML = `<section class="math-game" aria-labelledby="game-title">
<h2 id="game-title">A little mental detour</h2>
<p class="game-intro">Five quick math puzzles. No timer, no pressure.</p>
<p class="game-progress" id="game-progress">Question 1 of 5 · Score 0</p>
<p class="game-question" id="game-question">7 + 5 = ?</p>
<div class="game-answers" role="group" aria-labelledby="game-question">
<button type="button" disabled>9</button><button type="button" disabled>12</button><button type="button" disabled>14</button>
</div>
<p class="game-feedback" id="game-feedback" role="status" aria-live="polite" aria-atomic="true">Choose an answer to begin.</p>
<div class="game-bottom"><button type="button" id="game-next" disabled>Next puzzle</button><a href="https://mathmagician.lowkey.tools/" data-owleye-track="math-more">More math ↗</a></div>
<noscript><p>Enable JavaScript to play. The toolbox link still works.</p></noscript>
</section>`;

function playMath() {
  const game = document.querySelector('.math-game');
  if (!game) return;
  const answers = [...game.querySelectorAll('.game-answers button')];
  const question = game.querySelector('#game-question');
  const progress = game.querySelector('#game-progress');
  const feedback = game.querySelector('#game-feedback');
  const next = game.querySelector('#game-next');
  let round = 1;
  let score = 0;
  let correct = 12;
  let answered = false;
  const random = max => Math.floor(Math.random() * max);
  // Read the global at call time: a blocked analytics script just drops the event.
  const track = (name, data) => window.OwlEyeAnalytics?.track(name, data);
  let games = 0;
  const showProgress = () => { progress.textContent = `Question ${round} of 5 · Score ${score}`; };
  answers.forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const right = Number(button.textContent) === correct;
      if (right) score++;
      if (round === 1) track('math_game_started', { replay: games > 0 });
      if (round === 5) track('math_game_completed', { score, games_played: ++games });
      button.setAttribute('aria-pressed', 'true');
      answers.forEach(answer => answer.setAttribute('aria-disabled', 'true'));
      feedback.textContent = round === 5
        ? `${right ? 'Correct!' : `The answer is ${correct}.`} You got ${score} out of 5.`
        : right ? 'Correct! Ready for the next one?' : `The answer is ${correct}. Give the next one a go.`;
      showProgress();
      next.textContent = round === 5 ? 'Play again' : 'Next puzzle';
      next.disabled = false;
    });
  });
  next.addEventListener('click', () => {
    if (!answered) return;
    if (round === 5) { round = 1; score = 0; } else round++;
    answered = false;
    const a = random(12) + 1;
    const b = random(12) + 1;
    const operation = random(3);
    correct = operation === 0 ? a + b : operation === 1 ? Math.max(a, b) - Math.min(a, b) : a * b;
    question.textContent = operation === 0 ? `${a} + ${b} = ?` : operation === 1 ? `${Math.max(a, b)} − ${Math.min(a, b)} = ?` : `${a} × ${b} = ?`;
    // Three distinct nonnegative choices, with a randomized correct position.
    const choices = [correct, correct + random(4) + 1, Math.max(0, correct - random(4) - 1)];
    if (choices[2] === correct) choices[2] = choices[1] + 1;
    for (let i = choices.length - 1; i > 0; i--) { const j = random(i + 1); [choices[i], choices[j]] = [choices[j], choices[i]]; }
    answers.forEach((button, i) => {
      button.textContent = choices[i];
      button.removeAttribute('aria-pressed');
      button.removeAttribute('aria-disabled');
    });
    next.disabled = true;
    next.textContent = 'Next puzzle';
    feedback.textContent = 'Choose your answer.';
    showProgress();
    answers[0].focus({ preventScroll: true });
  });
}

// Inline modules are deferred automatically. No timers, storage or loop; the only
// network use is two optional analytics events (first answer and final score).
export const mathGameScript = `<script type="module">(${playMath.toString()})();</script>`;
