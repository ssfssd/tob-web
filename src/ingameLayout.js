// Screen coordinates only. Game rules and slot ownership stay in their runtime models.
export function pactScreenPoint(branch, index) {
  // Traced from the SS13 contract screen. The three spirits sit at the centre;
  // each branch follows a third of the outer circle, rather than a small loop.
  const points = [[346, 299], [450, 372], [312, 446], [239, 463], [172, 483], [192, 395], [195, 322], [205, 224], [283, 175], [345, 130], [403, 67], [324, 352]];
  const point = points[index + 2];
  if (!Number.isInteger(branch) || branch < 0 || branch > 2 || !point) return null;
  const angle = branch * Math.PI * 2 / 3;
  const x = point[0] - 500;
  const y = point[1] - 400;
  return { x: +(500 + x * Math.cos(angle) - y * Math.sin(angle)).toFixed(2), y: +(400 + x * Math.sin(angle) + y * Math.cos(angle)).toFixed(2) };
}

export function pactPointStyle(branch, index) {
  const point = pactScreenPoint(branch, index);
  return point ? `left:${point.x / 10}%;top:${point.y / 8}%` : "";
}

export function renderPactConnections() {
  return `<svg class="ingame-pact-lines" viewBox="0 0 1000 800" aria-hidden="true"><circle class="ingame-pact-seal" cx="500" cy="400" r="138"/>${[0, 1, 2].map((branch) => `<g transform="rotate(${branch * 120} 500 400)"><path class="ingame-pact-track" d="M450 372L390 336Q370 373 380 428L312 446L239 463L172 483L150 396L192 395L195 322L164 308L205 224L250 160L283 175L345 130L323 100L403 67L448 253Q383 274 346 299L324 352L318 389H242"/><path class="ingame-pact-rune" d="M500 309L491 389L395 466L500 442L605 466L509 389Z M500 350L456 425H544Z"/></g>`).join("")}<circle class="ingame-pact-emblem" cx="500" cy="400" r="38"/><path class="ingame-pact-emblem" d="M500 356L463 422H537Z M500 373V410L480 422 M500 410L520 422"/></svg>`;
}
