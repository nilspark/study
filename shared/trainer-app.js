// Trainer app integrator
// This script looks for page-defined functions/variables and replaces
// resetPools/showCurrentExpression/handleChoice/etc with unified implementations.

(function() {
  function safe(fn) {
    try { return fn(); } catch (e) { console.warn('trainer-app:', e); }
  }

  function integrate() {
    // expect the page to define: SET_SIZE, pool1,pool2,pool3, currentIdx,
    // expressionEl, timerEl, pool1CountEl, pool3CountEl, messageEl, choicesEl
    if (typeof SET_SIZE === 'undefined' || typeof pool1 === 'undefined') return;

    // page-provided callbacks (fall back to generic if missing)
    const genAll = window.generateAllExpressions || function() { return []; };
    const exprToStr = window.expressionToString || function(e){ return `${e.a} ${e.op} ${e.b}`; };
    const computeAnswer = window.computeAnswer || function(e){
      if (e.op === '+') return e.a + e.b;
      if (e.op === '-') return e.a - e.b;
      if (e.op === '×' || e.op === 'x' || e.op === '*') return e.a * e.b;
      return null;
    };

    // expose to window for debug
    window._trainer = window._trainer || {};

    // unified resetPools
    window.resetPools = function() {
      pool1.length = 0;
      pool2.length = 0;
      pool3.length = 0;
      const all = genAll();
      all.forEach(expr => pool1.push(Object.assign({}, expr, { wrongCount: 0 })));
      for (let i = 0; i < SET_SIZE && pool1.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool1.length);
        pool2.push(pool1.splice(idx,1)[0]);
      }
      currentIdx = 0;
      if (typeof updatePoolCountsGeneric === 'function') {
        const debugEl = document.getElementById('debug-pool2');
        updatePoolCountsGeneric(pool1,pool2,pool3,pool1CountEl,pool3CountEl,debugEl,exprToStr);
      }
      if (messageEl) messageEl.style.display = 'none';
      if (expressionEl) { expressionEl.textContent = ''; expressionEl.style.opacity = 0; }
      if (choicesEl) choicesEl.innerHTML = '';
      if (timerEl) timerEl.textContent = '00:00.000';
      started = false; startTime = null; clearInterval(intervalId);
      if (document.getElementById('center-message')) {
        document.getElementById('center-message').textContent = '시작하려면 화면을 터치하세요';
        document.getElementById('center-message').style.opacity = 1;
      }
    };

    // unified showCurrentExpression
    window.showCurrentExpression = function() {
      choicesEl.innerHTML = '';
      if (document.getElementById('main-content')) document.getElementById('main-content').style.display = '';
      if (pool2.length === 0) {
        if (expressionEl) { expressionEl.textContent = ''; expressionEl.style.opacity = 0; }
        if (document.getElementById('center-message')) {
          document.getElementById('center-message').textContent = '모든 문제를 맞췄습니다!';
          document.getElementById('center-message').style.opacity = 1;
        }
        if (messageEl) messageEl.textContent = '';
        clearInterval(intervalId);
        return;
      }
      if (currentIdx >= pool2.length) currentIdx = 0;
      const expr = pool2[currentIdx];
      if (expressionEl) { expressionEl.textContent = exprToStr(expr); expressionEl.style.opacity = 1; }

      const answer = computeAnswer(expr);
      // generate two wrongs (non-negative for subtraction pages)
      const wrongs = [];
      while (wrongs.length < 2) {
        let delta = (Math.floor(Math.random() * 5) + 1);
        let w = answer + delta * (Math.random() > 0.5 ? 1 : -1);
        // ensure non-negative
        if (w !== answer && w >= 0 && !wrongs.includes(w)) wrongs.push(w);
      }
      const choices = [answer, ...wrongs].sort(() => Math.random() - 0.5);
      choices.forEach(val => {
        const btn = document.createElement('button');
        btn.textContent = val;
        btn.style.minWidth = '4em';
        btn.style.fontSize = '2em';
        btn.style.padding = '1em';
        btn.style.margin = '0 0.5em';
        btn.onclick = () => { window.handleChoice(val, answer, expr, btn); };
        choicesEl.appendChild(btn);
      });
      if (typeof updatePoolCountsGeneric === 'function') {
        const debugEl = document.getElementById('debug-pool2');
        updatePoolCountsGeneric(pool1,pool2,pool3,pool1CountEl,pool3CountEl,debugEl,exprToStr);
      }
    };

    // unified handleChoice if not present
    if (typeof window.handleChoice !== 'function') {
      window.handleChoice = function(selected, answer, expr, btn, isTimeout=false) {
        if (!started) return;
        const correct = (selected === answer);
        if (correct) {
          if (typeof processCorrectGeneric === 'function') processCorrectGeneric(expr,pool1,pool2,pool3,SET_SIZE,exprToStr);
          if (document.getElementById('center-message')) {
            document.getElementById('center-message').textContent = '정답!';
            document.getElementById('center-message').style.opacity = 1;
          }
          currentIdx = (currentIdx + 1) % (pool2.length || 1);
          showCurrentExpression();
        } else {
          if (typeof processWrongGeneric === 'function') processWrongGeneric(expr, btn);
          if (document.getElementById('center-message')) {
            document.getElementById('center-message').textContent = '오답! 다시 선택하세요';
            document.getElementById('center-message').style.opacity = 1;
          }
        }
        if (typeof updatePoolCountsGeneric === 'function') {
          const debugEl = document.getElementById('debug-pool2');
          updatePoolCountsGeneric(pool1,pool2,pool3,pool1CountEl,pool3CountEl,debugEl,exprToStr);
        }
      };
    }

    // ensure start handlers exist (touch/click)
    if (!window._trainerStartAttached) {
      window._trainerStartAttached = true;
      function startIfNotStarted(e) {
        if (!started) {
          started = true;
          startTime = Date.now();
          intervalId = setInterval(function(){ if (typeof updateTimer === 'function') updateTimer(); }, 31);
          if (messageEl) messageEl.style.display = 'none';
          if (document.getElementById('center-message')) document.getElementById('center-message').textContent = '';
          if (document.getElementById('main-content')) document.getElementById('main-content').style.display = '';
          showCurrentExpression();
        }
      }
      document.addEventListener('click', startIfNotStarted);
      document.addEventListener('touchstart', startIfNotStarted);
    }

    // prevent non-button touches after start
    if (!window._trainerPreventAttached) {
      window._trainerPreventAttached = true;
      function preventNonButtonTouch(e) { if (!started) return; const choices = document.getElementById('choices'); if (!choices.contains(e.target) && e.target.tagName !== 'BUTTON') { e.stopPropagation(); e.preventDefault(); return false; } }
      document.addEventListener('click', preventNonButtonTouch, true);
      document.addEventListener('touchstart', preventNonButtonTouch, true);
    }

    // Disable pull-to-refresh and overscroll on touch devices
    try {
      // Preferred CSS approach for modern browsers
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.style.overscrollBehavior = 'none';
    } catch (e) {
      // ignore
    }
    // Additional JS guard: prevent touchmove that would trigger pull-to-refresh when at the top
    (function() {
      let touchStartY = 0;
      window.addEventListener('touchstart', function(e) {
        if (e.touches && e.touches.length === 1) touchStartY = e.touches[0].clientY;
      }, { passive: true });
      window.addEventListener('touchmove', function(e) {
        try {
          const scrollTop = document.scrollingElement ? document.scrollingElement.scrollTop : document.documentElement.scrollTop;
          const currentY = e.touches && e.touches.length ? e.touches[0].clientY : 0;
          // If we're at the top and user is pulling down, prevent default to stop pull-to-refresh
          if (scrollTop === 0 && (currentY - touchStartY) > 0) {
            e.preventDefault();
          }
        } catch (err) {
          // swallow errors
        }
      }, { passive: false });
    })();

    // --- Disable pinch/zoom (pinch, double-tap, ctrl/meta+wheel, key shortcuts) ---
    // Inject/override viewport meta to disallow user scaling (helps on many mobile browsers)
    try {
      let meta = document.querySelector('meta[name=viewport]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        document.head.appendChild(meta);
      }
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    } catch (e) {
      // ignore
    }

    // Set touch-action to reduce browser gestures (manipulation allows panning but blocks double-tap zoom)
    try {
      document.documentElement.style.touchAction = 'manipulation';
      document.body.style.touchAction = 'manipulation';
    } catch (e) {}

    // Block gesture events (iOS Safari)
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
      window.addEventListener(evt, function(e) { e.preventDefault(); }, { passive: false });
    });

    // Prevent multi-touch pinch (block touchstart when >1 touches)
    window.addEventListener('touchstart', function(e) {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // Prevent ctrl/meta + wheel pinch/zoom on desktop
    window.addEventListener('wheel', function(e) {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    }, { passive: false });

    // Prevent common keyboard zoom shortcuts (Ctrl/Cmd + +/-/0)
    window.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault();
      }
    }, false);

    // Note: iOS Safari may still allow some system gestures; if you need 100% prevention on iOS,
    // consider using a non-scrollable inner container pattern (more invasive).

    // initial reset
    safe(resetPools);

    // expose internals
    window._trainer.generateAllExpressions = genAll;
    window._trainer.expressionToString = exprToStr;
    window._trainer.computeAnswer = computeAnswer;
  }

  // run after short delay to let page scripts define functions/vars
  setTimeout(integrate, 0);
})();
