import { readBoundedBuildCode } from './seasonBuildCode.js';
import { isOfflineEdition } from './offlinePresentation.js';
import { RUNTIME_POLICY } from './runtimePolicy.js';

const origin = 'https://tools.winterer.dev';
const decoder = new TextDecoder('utf-8', {fatal:true});
const readJson = async stream => JSON.parse(decoder.decode(await readBoundedBuildCode(stream)), (key,value)=>{
  if (['__proto__','constructor','prototype'].includes(key)) throw new Error('빌드 데이터 형식이 올바르지 않습니다.');
  return value;
});

export function canLookUpIngameBuild() {
  return !isOfflineEdition() && (RUNTIME_POLICY.mode === 'local'
    || !!globalThis.document?.querySelector('[data-current-release]'));
}

export function parseIngameBuildCode(raw) {
  let code = typeof raw === 'string' && raw.length <= 2048 ? raw.trim() : '';
  if (code.startsWith('https://')) {
    const url = URL.parse(code);
    if (url?.origin === origin && !url.username && !url.password && url.pathname === '/tli/ingame/') code = url.searchParams.get('id') ?? '';
    else if (url?.origin === origin && !url.username && !url.password && url.pathname === '/tli/view/') code = url.searchParams.get('ingame') ?? '';
    else code = '';
    code = code.replaceAll(' ', '+');
  }
  if (!/^[A-Za-z0-9+/]{22}==$/u.test(code) || btoa(atob(code)) !== code)
    throw new Error('게임에서 복사한 빌드코드 또는 미니토치 인게임 링크를 입력하세요.');
  return code;
}

export async function lookUpIngameBuild(raw, fetcher = globalThis.fetch) {
  const code = parseIngameBuildCode(raw);
  const endpoint = new URL('/api/ingame',origin);
  endpoint.searchParams.set('id',code);
  let response;
  try {
    response = await fetcher(endpoint, {credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:AbortSignal.timeout(12000)});
  } catch {
    throw new Error('미니토치 변환기에 연결하지 못했습니다.');
  }
  if (response.status === 429) throw new Error('조회가 제한됐습니다. 잠시 뒤 다시 시도하세요.');
  if (response.status >= 500) throw new Error('미니토치 변환기가 응답하지 않습니다. 잠시 뒤 다시 시도하세요.');
  if (!response.ok) throw new Error('빌드를 찾지 못했습니다. 인게임 빌드코드를 확인하세요.');
  try {
    const result = await readJson(response.body);
    if (result?.ok !== true || typeof result.code !== 'string' || !/^TLP[01]\.[A-Za-z0-9_-]+$/u.test(result.code)) throw new Error();
    const bytes = Uint8Array.from(atob(result.code.slice(5).replaceAll('-','+').replaceAll('_','/')), c=>c.charCodeAt(0));
    const stream = new Blob([bytes]).stream();
    const payload = await readJson(result.code.startsWith('TLP1.') ? stream.pipeThrough(new DecompressionStream('deflate')) : stream);
    if (payload?.v !== 3) throw new Error();
    const text = value => typeof value === 'string' ? value.slice(0,160) : '';
    return { title:text(result.title)||text(payload.name), main:text(result.main), season:text(payload.se), payload };
  } catch {
    throw new Error('미니토치에서 받은 빌드 형식을 확인할 수 없습니다.');
  }
}
