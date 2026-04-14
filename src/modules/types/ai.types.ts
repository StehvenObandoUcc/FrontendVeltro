/**
 * Veltro AI Vision System - Type Definitions
 * 
 * Defines types for YOLO detection, backend matching results, and scan modes.
 * Strictly in English as per architectural standards.
 * NOTE: No imports from api/ here — avoids circular module resolution.
 */

export type ScanMode = 'barcode' | 'ai';

export type AiUseCase = 'pos-sell' | 'inventory-count';

/**
 * Lifecycle status of an AI detection
 * RAW → PENDING → SUCCESS → ADDED
 *                ↘ ERROR
 */
export type DetectionStatus = 'RAW' | 'PENDING' | 'SUCCESS' | 'ERROR' | 'ADDED';

/**
 * Minimal product shape needed by the AI detection types.
 * The full Product type lives in api/pos.ts.
 */
export interface MatchedProduct {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  salePrice: string;
  currentStock?: number;
}

/**
 * Bounding box from YOLO detection with tracking and matching state
 */
export interface YoloBox {
  /** Unique ID generated on frontend (UUID or timestamp-based) */
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  /** Class name from YOLO (e.g., 'bottle', 'can') */
  className: string;
  /** Current lifecycle status */
  status: DetectionStatus;
  /** Products matched by backend CLIP + Vector Search */
  matches: MatchedProduct[];
}

/**
 * AI Scanner configuration
 */
export interface AiScannerConfig {
  confidenceThreshold: number;
  maxRetries: number;
  processingDelayMs: number;
}

/**
 * Default AI Scanner configuration
 */
export const DEFAULT_AI_SCANNER_CONFIG: AiScannerConfig = {
  confidenceThreshold: 0.45,
  maxRetries: 3,
  processingDelayMs: 2000, // Cooldown between API calls
};