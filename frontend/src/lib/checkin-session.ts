// Camera frames must not submit again until the operator acknowledges the result.
export function createCheckInSession() {
  let phase: 'ready' | 'checking' | 'paused' = 'ready';

  return {
    get phase() { return phase; },
    begin(manual = false) {
      if (phase === 'checking' || (phase === 'paused' && !manual)) return false;
      phase = 'checking';
      return true;
    },
    finish() { phase = 'paused'; },
    resume() {
      if (phase === 'checking') return false;
      phase = 'ready';
      return true;
    },
  };
}
