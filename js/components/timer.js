let timerId = null;
let overlay = null;

export function startTimer(seconds) {
  if (overlay) {
    clearInterval(timerId);
    overlay.remove();
  }

  overlay = document.createElement('div');
  overlay.className = 'timer-overlay';
  overlay.innerHTML = `
    <div class="timer-box">
      <p class="timer-label">Descanso</p>
      <p class="timer-count" id="timer-count">${seconds}s</p>
      <button class="btn btn-secondary" id="timer-skip">Pular</button>
    </div>
  `;
  document.body.appendChild(overlay);

  let remaining = seconds;
  const countEl = overlay.querySelector('#timer-count');

  timerId = setInterval(() => {
    remaining--;
    countEl.textContent = `${remaining}s`;
    if (remaining <= 0) {
      clearInterval(timerId);
      timerId = null;
      if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
      overlay?.remove();
      overlay = null;
    }
  }, 1000);

  overlay.querySelector('#timer-skip').onclick = () => {
    clearInterval(timerId);
    timerId = null;
    overlay.remove();
    overlay = null;
  };
}
