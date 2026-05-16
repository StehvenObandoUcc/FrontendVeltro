import * as ort from 'onnxruntime-web';

// Global sessions
let encoderSession: ort.InferenceSession | null = null;
let decoderSession: ort.InferenceSession | null = null;
let isInitializing = false;

// Resolved tensor names (detected dynamically from the ONNX models)
let encoderInputName = 'input_image';   // will be overridden after load
let encoderOutputName = 'image_embeddings'; // will be overridden after load

// Mean and Std for standard ImageNet normalization
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

const INPUT_SIZE = 1024;

async function initModels() {
  if (encoderSession && decoderSession) return;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise((res) => setTimeout(res, 50));
    }
    return;
  }

  isInitializing = true;
  try {
    ort.env.wasm.numThreads = 1;

    // Load MobileSAM Encoder
    try {
      encoderSession = await ort.InferenceSession.create('/sam_model/mobile_sam_image_encoder.onnx', {
        executionProviders: ['webgl', 'wasm'],
      });

      // Load Single-Mask Decoder
      decoderSession = await ort.InferenceSession.create('/sam_model/sam_mask_decoder_single.onnx', {
        executionProviders: ['webgl', 'wasm'],
      });
    } catch (error) {
      console.error('[SAM Worker] Model missing or failed to load:', error);
      postMessage({ type: 'CRITICAL_ERROR', error: 'Failed to load MobileSAM models' });
      throw error;
    }

    // ── Discover actual tensor names from the loaded ONNX models ──
    console.log('[SAM Worker] Encoder inputs:', encoderSession.inputNames);
    console.log('[SAM Worker] Encoder outputs:', encoderSession.outputNames);
    console.log('[SAM Worker] Decoder inputs:', decoderSession.inputNames);
    console.log('[SAM Worker] Decoder outputs:', decoderSession.outputNames);

    // Use the first input/output name from the encoder (handles different export conventions)
    encoderInputName = encoderSession.inputNames[0] || 'input_image';
    encoderOutputName = encoderSession.outputNames[0] || 'image_embeddings';

    console.log(`[SAM Worker] Using encoder input="${encoderInputName}", output="${encoderOutputName}"`);
    console.log('[SAM Worker] MobileSAM models loaded successfully.');
  } catch (err) {
    console.error('[SAM Worker] Failed to load models:', err);
    postMessage({ type: 'ERROR', error: String(err) });
    throw err;
  } finally {
    isInitializing = false;
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data;

  if (type === 'PROCESS_BOXES') {
    const { pixels, boxes, videoWidth, videoHeight } = e.data;

    try {
      await initModels();

      if (!encoderSession || !decoderSession) {
        throw new Error('SAM models not initialized.');
      }

      // ── 1. Image Preprocessing for MobileSAM Encoder [H, W, 3] (HWC) ──
      // pixels: Uint8ClampedArray of shape [1024, 1024, 4] (RGBA)
      // This ONNX export expects raw pixel values (normalization is baked in the graph)
      const floatData = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
      const px = INPUT_SIZE * INPUT_SIZE;

      for (let i = 0; i < px; i++) {
        // HWC layout with raw pixel values [0, 255] as float32
        floatData[i * 3]     = pixels[i * 4];       // R
        floatData[i * 3 + 1] = pixels[i * 4 + 1];   // G
        floatData[i * 3 + 2] = pixels[i * 4 + 2];   // B
      }

      // ── 2. Run MobileSAM Encoder ──
      const t0 = performance.now();
      // MobileSAM expects HWC rank-3 input [H, W, 3]
      const encoderInputs: Record<string, ort.Tensor> = {
        [encoderInputName]: new ort.Tensor('float32', floatData, [INPUT_SIZE, INPUT_SIZE, 3]),
      };

      const encoderOutputs = await encoderSession.run(encoderInputs);
      const t1 = performance.now();
      console.log(`[SAM Worker] Encoder inference: ${(t1 - t0).toFixed(0)}ms`);

      const image_embeddings = encoderOutputs[encoderOutputName];
      if (!image_embeddings) {
        throw new Error(`SAM Encoder output "${encoderOutputName}" missing. Available: ${Object.keys(encoderOutputs)}`);
      }

      // Calculate letterbox scaling factors (same as main thread)
      const scaleSam = Math.min(INPUT_SIZE / videoWidth, INPUT_SIZE / videoHeight);
      const dwSam = videoWidth * scaleSam;
      const dhSam = videoHeight * scaleSam;
      const dxSam = (INPUT_SIZE - dwSam) / 2;
      const dySam = (INPUT_SIZE - dhSam) / 2;

      // ── 3. Run SAM Decoder for each box ──
      for (const box of boxes) {
        // Map box corners to the 1024x1024 scale (including letterbox padding)
        const x1 = box.x * scaleSam + dxSam;
        const y1 = box.y * scaleSam + dySam;
        const x2 = (box.x + box.width) * scaleSam + dxSam;
        const y2 = (box.y + box.height) * scaleSam + dySam;

        // Decoder Inputs:
        // point_coords: shape [1, 2, 2]
        const pointCoordsData = new Float32Array([x1, y1, x2, y2]);
        const pointCoords = new ort.Tensor('float32', pointCoordsData, [1, 2, 2]);

        // point_labels: shape [1, 2]. 2 = top-left, 3 = bottom-right for box prompts
        const pointLabelsData = new Float32Array([2.0, 3.0]);
        const pointLabels = new ort.Tensor('float32', pointLabelsData, [1, 2]);

        // mask_input: shape [1, 1, 256, 256]
        const maskInputData = new Float32Array(1 * 1 * 256 * 256);
        const maskInput = new ort.Tensor('float32', maskInputData, [1, 1, 256, 256]);

        // has_mask_input: shape [1]
        const hasMaskInputData = new Float32Array([0.0]);
        const hasMaskInput = new ort.Tensor('float32', hasMaskInputData, [1]);

        // Build decoder inputs dynamically based on what the model expects
        const decoderInputs: Record<string, ort.Tensor> = {
          image_embeddings,
          point_coords: pointCoords,
          point_labels: pointLabels,
          mask_input: maskInput,
          has_mask_input: hasMaskInput,
        };

        // Add orig_im_size if the decoder expects it
        if (decoderSession.inputNames.includes('orig_im_size')) {
          decoderInputs['orig_im_size'] = new ort.Tensor('float32', new Float32Array([INPUT_SIZE, INPUT_SIZE]), [2]);
        }

        const t2 = performance.now();
        const decoderOutputs = await decoderSession.run(decoderInputs);
        const t3 = performance.now();
        console.log(`[SAM Worker] Decoder inference: ${(t3 - t2).toFixed(0)}ms for box ${box.id.slice(0, 6)}`);

        // Try multiple possible output names
        const masksTensor = decoderOutputs['masks'] || decoderOutputs['low_res_masks'];
        const iouPredictions = decoderOutputs['iou_predictions'] || decoderOutputs['iou_pred'];

        if (!masksTensor) {
          console.error('[SAM Worker] No mask output found. Available keys:', Object.keys(decoderOutputs));
          throw new Error('SAM Decoder mask output missing.');
        }

        const masksData = masksTensor.data as Float32Array;
        const maskDims = masksTensor.dims; // e.g. [1, 1, 256, 256] or [1, 1, 1024, 1024]
        console.log(`[SAM Worker] Mask output shape: [${maskDims.join(', ')}]`);

        // Determine which mask to use
        let bestIdx = 0;
        const numMasks = Number(maskDims[1]);

        // If multi-mask output, pick the one with highest IoU score
        if (numMasks > 1 && iouPredictions) {
          const iouData = iouPredictions.data as Float32Array;
          let maxIou = iouData[0];
          for (let idx = 1; idx < numMasks; idx++) {
            if (iouData[idx] > maxIou) {
              maxIou = iouData[idx];
              bestIdx = idx;
            }
          }
        }

        const maskH = Number(maskDims[2]);
        const maskW = Number(maskDims[3]);

        let binaryMask: Uint8Array;

        if (maskH === INPUT_SIZE && maskW === INPUT_SIZE) {
          // Mask is already full resolution — just threshold
          const maskSize = INPUT_SIZE * INPUT_SIZE;
          const offset = bestIdx * maskSize;
          binaryMask = new Uint8Array(maskSize);
          for (let i = 0; i < maskSize; i++) {
            binaryMask[i] = masksData[offset + i] > 0.0 ? 1 : 0;
          }
        } else {
          // Low-res mask — upscale using existing utility
          const { upscaleSamMaskLogitsToBinary } = await import('./samUpscale');
          binaryMask = upscaleSamMaskLogitsToBinary(masksData, bestIdx, INPUT_SIZE, maskH);
        }

        // Send binary mask back to main thread using Transferable Objects
        postMessage(
          {
            type: 'MASK_READY',
            boxId: box.id,
            mask: {
              detectionId: box.id,
              maskData: binaryMask,
              maskWidth: INPUT_SIZE,
              maskHeight: INPUT_SIZE,
            },
          },
          [binaryMask.buffer] as any
        );
      }
    } catch (err) {
      console.error('[SAM Worker] Processing error:', err);
      postMessage({ type: 'ERROR', error: String(err) });
    }
  }
};
