// The cloud packager replaces only this policy, never calculation or build data.
export const RUNTIME_POLICY = Object.freeze({ mode: "cloud", allowGameLogs: false });
export const LOCAL_LOG_ONLY_MESSAGE = "게임 로그는 PC에서 실행한 TOB에서만 가져올 수 있습니다. PC에서 처리한 TOB SS14 빌드 JSON을 가져오세요.";
export function assertLocalLogAccess() {
  if (!RUNTIME_POLICY.allowGameLogs) throw new Error(LOCAL_LOG_ONLY_MESSAGE);
}
