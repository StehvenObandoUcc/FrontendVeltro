import { describe, expect, it } from 'vitest';
import { upscaleSamMaskLogitsToBinary } from './samUpscale';

describe('upscaleSamMaskLogitsToBinary', () => {
  it('returns a 1024x1024 Uint8Array without out-of-bounds', () => {
    // SAM ViT-B decoder masks tensor: [1, 4, 256, 256]
    const masks = new Float32Array(1 * 4 * 256 * 256);

    // Put a few positive logits in mask 2 so output isn't all zeros.
    const lowRes = 256;
    const idx = 2;
    const base = idx * lowRes * lowRes;
    masks[base + 0] = 1.0;
    masks[base + 10] = 2.0;
    masks[base + (lowRes - 1) * lowRes + (lowRes - 1)] = 3.0;

    const out = upscaleSamMaskLogitsToBinary(masks, idx);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBe(1024 * 1024);
    // spot check: must be binary
    expect(out[0] === 0 || out[0] === 1).toBe(true);
  });
});
