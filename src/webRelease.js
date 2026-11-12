// Only the published Pages document has a release bar and a version endpoint.
export function watchWebRelease(bar, prepare) {
  if (!bar?.dataset?.currentRelease) return;
  const button = bar.querySelector('button');
  const message = bar.querySelector('[role="status"]');
  let available, checking = false;
  async function check() {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const url = new URL('./web-release.json', location.href);
      url.searchParams.set('check', String(Date.now()));
      const response = await fetch(url, {cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer', redirect:'error', signal:AbortSignal.timeout(10000)});
      if (!response.ok) return;
      const next = await response.json();
      if (!/^[0-9a-f]{8}$/u.test(next.version) || !(Date.parse(next.updated) > Date.parse(bar.querySelector('time').dateTime))) return;
      available = next.version;
      if (button.hidden) message.textContent = '새 버전이 있습니다.';
      button.hidden = false;
    } catch { /* Offline editing continues. Retry on focus or the next poll. */ }
    finally { checking = false; }
  }
  button.addEventListener('pointerdown', event => event.preventDefault());
  button.addEventListener('click', () => {
    if (!available || button.disabled) return;
    button.disabled = true;
    try {
      prepare();
      const url = new URL(location.href);
      url.searchParams.set('release', available);
      location.replace(url.href);
    } catch (error) {
      message.textContent = error?.message || '편집 내용을 저장하지 못했습니다. 다시 시도하세요.';
      button.disabled = false;
    }
  });
  document.addEventListener('visibilitychange', check);
  window.addEventListener('focus', check);
  window.addEventListener('online', check);
  window.setInterval(check, 30000);
  void check();
}
