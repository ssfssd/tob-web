// A log import does not assert that unchanged, unrecorded groups are complete.
export const LOG_REVIEW_GROUPS = { hero: '히어로·특성·추억', talents: '재능·프리즘', pact: '정령·운명', divinity: '석판 배치' };
const fingerprint = (build, group) => JSON.stringify([build[group], group === 'hero' ? build.ss14Inputs?.heroTiers : null]);
export function validLogReview(value) {
  return value === undefined || value && !Array.isArray(value) && Object.keys(value).every(k => Object.hasOwn(LOG_REVIEW_GROUPS, k))
    && Object.values(value).every(v => v === null || typeof v === 'string' && v.length < 200000);
}
export function logReviewRows(build) {
  return Object.entries(build.ss14Inputs?.logReview ?? {}).map(([key, saved]) => ({ key, label: LOG_REVIEW_GROUPS[key], confirmed: saved !== null && saved === fingerprint(build, key) }));
}
export function editLogReview(build, key, value) {
  if (!Object.hasOwn(build.ss14Inputs?.logReview ?? {}, key) || ![0, 1].includes(value)) throw new Error('로그에 없는 구성의 확인 항목을 선택하세요.');
  build.ss14Inputs.logReview[key] = value === 1 ? fingerprint(build, key) : null;
}
