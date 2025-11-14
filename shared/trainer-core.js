// Shared trainer core utilities for pool management
// Functions are generic and operate on arrays passed by reference.

function processCorrectGeneric(expr, pool1, pool2, pool3, SET_SIZE, expressionToString) {
  if (typeof expr.wrongCount === 'number' && expr.wrongCount > 0) {
    expr.wrongCount--;
  } else if (expr.wrongCount === 0) {
    expr.wrongCount = -1;
  }
  const key = expressionToString(expr);
  if (expr.wrongCount === -1) {
    if (!pool3.some(e => expressionToString(e) === key)) {
      pool3.push(expr);
    }
    // remove from active pool2
    for (let i = pool2.length - 1; i >= 0; i--) {
      if (expressionToString(pool2[i]) === key) pool2.splice(i, 1);
    }
  }
  // refill pool2 from pool1
  while (pool2.length < SET_SIZE && pool1.length > 0) {
    const idx = Math.floor(Math.random() * pool1.length);
    pool2.push(pool1.splice(idx, 1)[0]);
  }
}

function processWrongGeneric(expr, btn) {
  if (typeof expr.wrongCount === 'number') {
    expr.wrongCount++;
  } else {
    expr.wrongCount = 1;
  }
  if (btn) btn.disabled = true;
}

function updatePoolCountsGeneric(pool1, pool2, pool3, pool1CountEl, pool3CountEl, debugEl, expressionToString) {
  if (pool1CountEl) pool1CountEl.textContent = `대기: ${pool1.length + pool2.length}`;
  if (pool3CountEl) pool3CountEl.textContent = `완료: ${pool3.length}`;
  if (debugEl && typeof debugEl !== 'undefined') {
    debugEl.innerHTML = pool2.map(e => `${expressionToString(e)} <span style='color:#c00'>(${e.wrongCount||0})</span>`).join(', ');
  }
}
