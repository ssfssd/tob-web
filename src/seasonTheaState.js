// Calculation-only state. Exported build documents cannot forge a simulated
// blessing cap or a computed Boon instance through an extra JSON field.
const states = new WeakMap();
export const theaState = build => states.get(build);
export function bindTheaState(build, state) { states.set(build, state); return build; }
