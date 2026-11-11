import { openSharedSeasonBuild, shareableSeasonBuild } from './seasonWorkspace.js';

const prefix = 'TOB14-1.';
const maxBytes = 2_000_000;
const maxCodeChars = 2_700_000;

async function readBounded(stream) {
  const reader = stream.getReader(), chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new Error('공유 가능한 빌드 크기를 초과했습니다.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function encodeBuildCode(document) {
  const blob = new Blob([JSON.stringify(shareableSeasonBuild(document))]);
  if (blob.size > maxBytes) throw new Error('공유 가능한 빌드 크기를 초과했습니다.');
  const bytes = await readBounded(blob.stream().pipeThrough(new CompressionStream('gzip')));
  let binary = '';
  for (let pos=0; pos<bytes.length; pos+=8192) binary += String.fromCharCode(...bytes.subarray(pos,pos+8192));
  return prefix + btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/u,'');
}

export async function decodeBuildCode(raw) {
  if (typeof raw !== 'string' || raw.length > maxCodeChars) throw new Error('빌드 코드 길이를 확인하세요.');
  const text = raw.trim();
  if (!text.startsWith(prefix)) throw new Error('TOB14-1. 으로 시작하는 빌드 코드를 붙여넣으세요.');
  try {
    const encoded = text.slice(prefix.length);
    if (!/^[A-Za-z0-9_-]+$/u.test(encoded)) throw new Error();
    const bytes = Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')), c=>c.charCodeAt(0));
    const plain = await readBounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')));
    const value = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plain), (key, entry) => {
      if (['__proto__','constructor','prototype'].includes(key)) throw new Error();
      return entry;
    });
    return openSharedSeasonBuild(value);
  } catch { throw new Error('빌드 코드를 열 수 없습니다. 전체 코드를 다시 복사하세요.'); }
}
