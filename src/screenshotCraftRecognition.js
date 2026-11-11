// Crafting screens use colored T badges beside independently wrapped text.
// Keep that spatial association instead of joining neighboring OCR lines.
export function getScreenshotCraftBadges(pixels, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const colored = point => {
    const offset = point * 4;
    const high = Math.max(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
    const low = Math.min(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
    return high >= 60 && high <= 210 && high - low >= 35;
  };
  const boxes = [];
  for (let point = 0; point < visited.length; point += 1) {
    if (visited[point] || !colored(point)) continue;
    let head = 0, tail = 1;
    queue[0] = point; visited[point] = 1;
    let left = width, right = 0, top = height, bottom = 0;
    while (head < tail) {
      const current = queue[head++], x = current % width, y = Math.floor(current / width);
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const next of [x ? current - 1 : -1, x + 1 < width ? current + 1 : -1, current - width, current + width]) {
        if (next < 0 || next >= visited.length || visited[next] || !colored(next)) continue;
        visited[next] = 1; queue[tail++] = next;
      }
    }
    const w = right - left + 1, h = bottom - top + 1;
    if (w >= 16 && w <= width * .2 && h >= 9 && h <= height * .09
      && w / h >= 1.25 && w / h <= 2.8 && tail / (w * h) > .5) boxes.push({ left, top, width: w, height: h });
  }
  // A single colored icon is not a crafting column.
  return boxes.filter(box => boxes.filter(other => Math.abs(other.left - box.left) < 4
    && Math.abs(other.width - box.width) < 5).length >= 3).sort((a, b) => a.top - b.top).slice(0, 12);
}

export function reconcileScreenshotResourceLabel(text, englishText) {
  // HP/MP can become Korean-looking glyphs. Require a separate read of the
  // same pixels and the exact same signed number before restoring the label.
  for (const match of String(englishText).matchAll(/\b(HP|MP)\s*(\+\d+(?:\.\d+)?)(?![\d.])/gu)) {
    const number = match[2].replace(/[+.]/gu, '\\$&');
    text = text.replace(new RegExp(`최대\\s*[^+\\n]{1,6}(?=\\s*${number}(?![\\d.]))`, 'u'), `최대 ${match[1]} `);
  }
  // Korean OCR can read the Latin metre glyph as ㅁ. Cross-check the same
  // distance in English; a numeric misread (such as 7 or 0) is never replaced.
  for (const match of String(englishText).matchAll(/(?<!\d)(\d+(?:\.\d+)?)\s*m(?![a-z])/gu)) {
    const number = match[1].replace(/\./gu, '\\.');
    text = text.replace(new RegExp(`(?<!\\d)(${number})\\s*[ㅁ]{1,2}(?=\\s*이동)`, 'gu'), '$1 m ');
  }
  return text;
}

async function prepareCraftRows(file) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return [];
  const bitmap = await createImageBitmap(file);
  try {
    // This pass is only used for the user-selected tooltip, not large frames.
    if (bitmap.width * bitmap.height > 2_000_000) return [];
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return [];
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const boxes = getScreenshotCraftBadges(pixels, canvas.width, canvas.height);
    const crop = (x, y, w, h, badge = false, channel = 'red', threshold = 140) => {
      const result = document.createElement('canvas');
      result.width = Math.ceil(w * 4 + 32); result.height = Math.ceil(h * 4 + 32);
      const ctx = result.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = badge ? '#333' : '#fff'; ctx.fillRect(0, 0, result.width, result.height);
      ctx.drawImage(canvas, x, y, w, h, 16, 16, w * 4, h * 4);
      if (badge && channel !== 'original') {
        const image = ctx.getImageData(0, 0, result.width, result.height);
        for (let n = 0; n < image.data.length; n += 4) {
          const light = channel === 'red' ? image.data[n] : channel === 'green' ? image.data[n + 1] : channel === 'blue' ? image.data[n + 2]
            : image.data[n] * .299 + image.data[n + 1] * .587 + image.data[n + 2] * .114;
          image.data[n] = image.data[n + 1] = image.data[n + 2] = light > threshold ? 0 : 255;
        }
        ctx.putImageData(image, 0, 0);
      }
      return result;
    };
    const isolatedBadge = (box, channel, threshold) => {
      const mask = document.createElement('canvas');
      mask.width = box.width - 12; mask.height = box.height + 4;
      const ctx = mask.getContext('2d');
      ctx.drawImage(canvas, box.left + 6, box.top - 2, mask.width, mask.height, 0, 0, mask.width, mask.height);
      const image = ctx.getImageData(0, 0, mask.width, mask.height);
      for (let n = 0; n < image.data.length; n += 4) {
        const value = image.data[n + channel] > threshold ? 0 : 255;
        image.data[n] = image.data[n + 1] = image.data[n + 2] = value;
      }
      ctx.putImageData(image, 0, 0);
      const result = document.createElement('canvas');
      result.width = mask.width * 6 + 32; result.height = mask.height * 6 + 32;
      const out = result.getContext('2d');
      out.fillStyle = '#fff'; out.fillRect(0, 0, result.width, result.height);
      out.imageSmoothingEnabled = false;
      out.drawImage(mask, 16, 16, mask.width * 6, mask.height * 6);
      mask.width = mask.height = 1;
      return result;
    };
    return boxes.map((box, index) => {
      // Saturation finds the badge center; dark gradient edges can extend
      // above it. Preserve the thin top stroke of T before thresholding.
      const dark = y => {
        const offset = (y * canvas.width + box.left + 4) * 4;
        return Math.max(pixels[offset], pixels[offset + 1], pixels[offset + 2]) < 190;
      };
      let badgeTop = box.top, badgeBottom = box.top + box.height - 1;
      while (badgeTop > Math.max(0, box.top - 8) && dark(badgeTop - 1)) badgeTop--;
      while (badgeBottom < Math.min(canvas.height - 1, box.top + box.height + 8) && dark(badgeBottom + 1)) badgeBottom++;
      const x = box.left + box.width + 5;
      const y = Math.max(0, Math.floor(box.top - box.height * .55));
      const bottom = Math.min(canvas.height, box.top + box.height * 2.25,
        boxes[index + 1] ? boxes[index + 1].top - box.height * .55 : canvas.height);
      const body = crop(x, y, canvas.width - x - 12, bottom - y);
      const compactTop = Math.max(0, box.top - box.height);
      const compactBottom = Math.min(canvas.height, box.top + box.height * 1.75,
        boxes[index + 1]?.top ?? canvas.height);
      const compactBody = document.createElement('canvas');
      compactBody.width = (canvas.width - x - 14) * 2 + 32;
      compactBody.height = (compactBottom - compactTop) * 2 + 32;
      const compactContext = compactBody.getContext('2d');
      compactContext.fillStyle = '#fff'; compactContext.fillRect(0, 0, compactBody.width, compactBody.height);
      compactContext.drawImage(canvas, x + 2, compactTop, canvas.width - x - 14, compactBottom - compactTop,
        16, 16, (canvas.width - x - 14) * 2, (compactBottom - compactTop) * 2);
      const bodies = [[0, 140], [1, 180], [2, 210]].map(([channel, threshold]) => {
        const result = crop(x, y, canvas.width - x - 12, bottom - y);
        const ctx = result.getContext('2d'), image = ctx.getImageData(0, 0, result.width, result.height);
        for (let n = 0; n < image.data.length; n += 4) {
          const value = image.data[n + channel] < threshold ? 0 : 255;
          image.data[n] = image.data[n + 1] = image.data[n + 2] = value;
        }
        ctx.putImageData(image, 0, 0); return result;
      });
      return { badges: [
        ...[['red', 100], ['red', 140], ['green', 55], ['green', 95], ['original', 0]]
          .map(([channel, threshold]) => crop(box.left + 4, badgeTop + 1, box.width - 8, badgeBottom - badgeTop - 1, true, channel, threshold)),
        ...[[1, 88], [1, 96], [1, 100], [2, 30], [2, 32], [2, 50], [2, 64]]
          .map(([channel, threshold]) => isolatedBadge(box, channel, threshold)),
      ], body, bodies, compactBody };
    });
  } finally { bitmap.close(); }
}

export async function recognizeScreenshotCraftRows(worker, file, prepareRows = prepareCraftRows) {
  if (typeof worker.reinitialize !== 'function') return [];
  const rows = await prepareRows(file);
  if (!rows.length) return [];
  try {
    await worker.reinitialize('eng');
    await worker.setParameters({ tessedit_pageseg_mode: '7', tessedit_char_whitelist: 'T0123456789+' });
    const tiers = [];
    for (const row of rows) {
      const readings = [];
      for (const badge of row.badges) {
        const text = (await worker.recognize(badge)).data.text.replace(/\s+/gu, '');
        if (/^[T17]\d\+?$/u.test(text)) readings.push({ tier: `T${text.slice(1)}`, exact: text.startsWith('T') });
      }
      const counts = [...new Set(readings.map(reading => reading.tier))].map(tier => ({tier,
        count:readings.filter(reading => reading.tier === tier).length,
        exact:readings.filter(reading => reading.tier === tier && reading.exact).length,
      })).sort((a,b) => b.count-a.count);
      // In a detected badge only, two independent contrast reads must agree
      // before restoring a T whose thin crossbar was read as 1 or 7.
      const best = counts[0];
      tiers.push(best && ((counts.length === 1 && best.count >= 2)
        || (best.count >= 4 && best.exact >= 2 && best.count / readings.length >= .8)) ? best.tier : null);
    }
    await worker.setParameters({ tessedit_pageseg_mode: '7', tessedit_char_whitelist: '' });
    const english = [];
    for (const row of rows) english.push((await worker.recognize(row.body)).data.text);
    await worker.setParameters({ tessedit_pageseg_mode: '6', tessedit_char_whitelist: '' });
    const compactEnglish = [];
    for (const row of rows) compactEnglish.push(row.compactBody ? (await worker.recognize(row.compactBody)).data.text : '');
    await worker.reinitialize('kor');
    await worker.setParameters({ tessedit_pageseg_mode: '6', tessedit_char_whitelist: '' });
    const compactKorean = [];
    for (const row of rows) compactKorean.push(row.compactBody ? (await worker.recognize(row.compactBody)).data.text : '');
    await worker.reinitialize(['kor', 'eng']);
    await worker.setParameters({ tessedit_pageseg_mode: '6', tessedit_char_whitelist: '' });
    const texts = [];
    // Non-enumerable provenance preserves the existing string-array API.
    Object.defineProperty(texts, 'craftRows', {value:[]});
    for (let index = 0; index < rows.length; index += 1) {
      if (!tiers[index]) continue;
      const readings = [];
      const addReading = body => {
        const text = reconcileScreenshotResourceLabel(body, `${english[index]}\n${compactEnglish[index]}`).trim();
        if (/^(?:초급|진급|절대자)\s*[:：.]/u.test(text) && !/[|『』]/u.test(text)) readings.push(text.replace(/\s+/gu, ' '));
      };
      addReading(compactKorean[index]);
      for (const image of [rows[index].body, ...(rows[index].bodies ?? [])]) {
        const body = (await worker.recognize(image)).data.text;
        addReading(body);
      }
      // A separately read explicit sign wins over a read where its pixels
      // merged into a leading digit. Never synthesize or alter that number.
      const signed = readings.filter(text => /[+-]\d/u.test(text));
      const rowTexts = [...new Set(signed.length ? signed : readings)].map(text => `${tiers[index]} ${text}`);
      texts.push(...rowTexts);
      texts.craftRows.push(rowTexts);
    }
    return texts;
  } finally {
    for (const row of rows) for (const canvas of [...row.badges, row.body, ...(row.bodies ?? []), row.compactBody].filter(Boolean)) canvas.width = canvas.height = 1;
    await worker.setParameters({ tessedit_char_whitelist: '' });
  }
}
