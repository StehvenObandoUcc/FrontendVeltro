const DEFAULT_INPUT_SIZE = 1024;
const DEFAULT_LOW_RES = 256;

/**
 * SAM (ViT-B) decoder returns low-res logits [1, 4, 256, 256].
 * This upscales a selected mask to 1024x1024 using nearest-neighbor and
 * thresholds logits at 0.0 into a binary Uint8Array (0/1).
 */
export function upscaleSamMaskLogitsToBinary(
  masksData: Float32Array,
  bestIdx: number,
  inputSize = DEFAULT_INPUT_SIZE,
  lowRes = DEFAULT_LOW_RES,
): Uint8Array {
  const lowMaskSize = lowRes * lowRes;
  const offset = bestIdx * lowMaskSize;
  if (offset < 0 || offset + lowMaskSize > masksData.length) {
    throw new Error('Mask logits buffer too small for selected index');
  }

  const outSize = inputSize * inputSize;
  const binaryMask = new Uint8Array(outSize);
  const ratio = lowRes / inputSize;

  for (let y = 0; y < inputSize; y++) {
    const srcY = Math.min(Math.floor(y * ratio), lowRes - 1);
    const rowBase = srcY * lowRes;
    const outRowBase = y * inputSize;
    for (let x = 0; x < inputSize; x++) {
      const srcX = Math.min(Math.floor(x * ratio), lowRes - 1);
      const logit = masksData[offset + rowBase + srcX];
      binaryMask[outRowBase + x] = logit > 0.0 ? 1 : 0;
    }
  }

  return binaryMask;
}
