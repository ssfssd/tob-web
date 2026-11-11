import { recognizeScreenshotCraftRows } from './screenshotCraftRecognition.js';

export function getScreenshotOcrSize(width, height, requestedScale) {
  const scale = Math.min(requestedScale, 3200 / Math.max(width, height), Math.sqrt(6_000_000 / (width * height)));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}

export function invertScreenshotPixels(pixels, mode = "invert") {
  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = mode === "red"
      ? pixels[index]
      : Math.round(pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114);
    const gray = 255 - (mode === "contrast" ? Math.max(0, Math.min(255, (luminance - 75) * 3)) : luminance);
    pixels[index] = gray;
    pixels[index + 1] = gray;
    pixels[index + 2] = gray;
  }
}

async function prepareScreenshotForOcr(file, scale, mode) {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined" || typeof document.createElement !== "function") return null;
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const size = getScreenshotOcrSize(bitmap.width, bitmap.height, scale);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    invertScreenshotPixels(image.data, mode);
    context.putImageData(image, 0, 0);
    return canvas;
  } finally {
    bitmap.close();
  }
}

export function getScreenshotSelectedLabelRegions(pixels, width, height) {
  const isBorder = (x, y) => {
    const index = (y * width + x) * 4;
    const low = Math.min(pixels[index], pixels[index + 1], pixels[index + 2]);
    const high = Math.max(pixels[index], pixels[index + 1], pixels[index + 2]);
    return low > 190 && high - low < 55;
  };
  const bands = [];
  for (let y = 0; y < height; y += 1) {
    let start = -1;
    for (let x = 0; x <= width; x += 1) {
      if (x < width && isBorder(x, y)) {
        if (start < 0) start = x;
        continue;
      }
      if (start < 0) continue;
      const length = x - start;
      if (length >= Math.max(80, width * 0.06) && length < width * 0.5) {
        const band = bands.find(candidate => y - candidate.bottom < 5
          && Math.abs(candidate.left - start) < 12 && Math.abs(candidate.right - x) < 12);
        if (band) {
          band.bottom = y;
          band.left = Math.min(band.left, start);
          band.right = Math.max(band.right, x);
        } else {
          // Busy scenes should not create an unbounded number of OCR jobs.
          if (bands.length >= 128) return [];
          bands.push({ top: y, bottom: y, left: start, right: x });
        }
      }
      start = -1;
    }
  }
  const regions = [];
  for (const top of bands) {
    for (const bottom of bands) {
      const innerHeight = bottom.top - top.bottom;
      const innerWidth = Math.min(top.right, bottom.right) - Math.max(top.left, bottom.left);
      if (innerHeight < height * 0.025 || innerHeight > height * 0.15
        || innerWidth / innerHeight < 2 || innerWidth / innerHeight > 10
        || Math.abs(top.left - bottom.left) > 20 || Math.abs(top.right - bottom.right) > 20) continue;
      const padding = Math.ceil(innerHeight * 0.2);
      const iconWidth = Math.ceil(innerWidth * 0.3);
      // Selected in-game tabs put an icon before the name. Exclude the icon
      // and glowing border, which Tesseract otherwise treats as one picture.
      const region = {
        left: Math.max(top.left, bottom.left) + iconWidth,
        top: top.bottom + padding,
        width: innerWidth - iconWidth - padding,
        height: innerHeight - padding * 2,
      };
      if (regions.some(previous => Math.abs(previous.left - region.left) < 12
        && Math.abs(previous.top - region.top) < 12)) continue;
      regions.push(region);
      if (regions.length === 4) return regions;
    }
  }
  return regions;
}

async function prepareScreenshotLabelRegions(file) {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined" || typeof document.createElement !== "function") return [];
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  try {
    const size = getScreenshotOcrSize(bitmap.width, bitmap.height, 1);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return [];
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    return getScreenshotSelectedLabelRegions(pixels, canvas.width, canvas.height).map(region => {
      const label = document.createElement("canvas");
      const labelSize = getScreenshotOcrSize(region.width, region.height, 3);
      label.width = labelSize.width;
      label.height = labelSize.height;
      label.getContext("2d")?.drawImage(canvas, region.left, region.top, region.width, region.height, 0, 0, label.width, label.height);
      return label;
    });
  } finally {
    bitmap.close();
    canvas.width = canvas.height = 1;
  }
}

export async function recognizeScreenshotText(worker, file, {
  prepareImage = prepareScreenshotForOcr,
  prepareRegions = prepareScreenshotLabelRegions,
  detail = false,
  recognizeCraftRows = recognizeScreenshotCraftRows,
} = {}) {
  await worker.setParameters({ tessedit_pageseg_mode: "6" });
  const original = await worker.recognize(file);
  const texts = [original.data.text];
  // Outlined labels need different scales; colored gear titles and skill
  // labels also need contrast/channel passes without guessing catalog names.
  const preparedSizes = new Set();
  const passes = [[2, "invert"], [3, "invert"], [1, "contrast"], [1, "red"]];
  for (const [scale, mode] of passes) {
    let image = null;
    try {
      image = await prepareImage(file, scale, mode);
      if (!image) break;
      if (Number.isFinite(image.width) && Number.isFinite(image.height)) {
        const key = `${mode}:${image.width}x${image.height}`;
        if (preparedSizes.has(key)) continue;
        preparedSizes.add(key);
      }
      await worker.setParameters({ tessedit_pageseg_mode: "11" });
      const enhanced = await worker.recognize(image);
      texts.push(enhanced.data.text);
    } catch {
      // A browser lacking image preparation still has the original result.
    } finally {
      if (image && typeof image !== "string") {
        image.width = 1;
        image.height = 1;
      }
    }
  }
  let regions = [];
  try {
    regions = await prepareRegions(file);
    if (regions.length) await worker.setParameters({ tessedit_pageseg_mode: "6" });
    for (const region of regions) {
      try {
        texts.push((await worker.recognize(region)).data.text);
      } catch {
        // One unreadable highlighted label does not discard other results.
      }
    }
  } catch {
    // Region detection is optional, like the full-frame enhancement passes.
  } finally {
    for (const region of regions) region.width = region.height = 1;
  }
  // Mixed-language OCR can replace a dim Korean equipment title with Latin
  // fragments. Re-read only the selected tooltip in Korean, retaining the
  // multilingual pass for HP/MP labels and all original numeric evidence.
  if (detail && typeof worker.reinitialize === 'function') {
    let image = null;
    try {
      image = await prepareImage(file, 1, 'contrast');
      if (image) {
        await worker.reinitialize('kor');
        await worker.setParameters({ tessedit_pageseg_mode: '11' });
        texts.push((await worker.recognize(image)).data.text);
      }
    } catch {
      // The optional language pass must not discard successful recognition.
    } finally {
      if (image) image.width = image.height = 1;
    }
  }
  if (detail) {
    try {
      const craftTexts = await recognizeCraftRows(worker, file);
      texts.push(...craftTexts);
      Object.defineProperty(texts, 'craftRows', {value:craftTexts.craftRows ?? []});
    }
    catch { /* Optional badge detection cannot discard the other OCR passes. */ }
  }
  return texts;
}

export function normalizeScreenshotRegion(region) {
  if (!region || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(region[key]))) return null;
  const x = Math.max(0, Math.min(1, region.x));
  const y = Math.max(0, Math.min(1, region.y));
  const width = Math.min(1 - x, region.width);
  const height = Math.min(1 - y, region.height);
  return width >= 0.02 && height >= 0.02 ? { x, y, width, height } : null;
}

export async function cropScreenshotFile(file, region) {
  const selection = normalizeScreenshotRegion(region);
  if (!selection) throw new Error('Invalid screenshot region');
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  try {
    const size = getScreenshotOcrSize(bitmap.width * selection.width, bitmap.height * selection.height, 1);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Screenshot canvas unavailable');
    context.drawImage(bitmap, bitmap.width * selection.x, bitmap.height * selection.y,
      bitmap.width * selection.width, bitmap.height * selection.height, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Screenshot crop unavailable');
    return blob;
  } finally {
    bitmap.close();
    canvas.width = canvas.height = 1;
  }
}
