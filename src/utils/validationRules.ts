/**
 * Catálogo compartido de reglas de validación Zod por tipo de campo.
 *
 * Single source of truth para todos los formularios de Veltro.
 * Importar desde aquí en lugar de definir reglas ad-hoc por módulo.
 */
import { z } from 'zod';

// ─── Textos generales ───────────────────────────────────────────────────────

/** Nombre de persona, empresa o negocio */
export const nameField = (label = 'El nombre') =>
  z.string().min(1, `${label} es requerido`).max(100, `${label} no puede exceder 100 caracteres`).trim();

/** Nombre de producto (límite mayor por especificaciones técnicas) */
export const productNameField = () =>
  z.string().min(1, 'El nombre es requerido').max(200, 'El nombre no puede exceder 200 caracteres');

/** Descripción libre (textarea) */
export const descriptionField = (max = 500) =>
  z.string().max(max, `La descripción no puede exceder ${max} caracteres`).optional();

/** Notas (textarea, límite estricto para evitar desbordamiento) */
export const notesField = (max = 255) =>
  z.string().max(max, `Las notas no pueden exceder ${max} caracteres`).optional().or(z.literal(''));

// ─── Identidad y autenticación ───────────────────────────────────────────────

/** Nombre de usuario para login y registro */
export const usernameField = () =>
  z
    .string()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(20, 'El usuario no puede exceder 20 caracteres')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Solo se permiten letras, números, guiones y puntos');

/** Email para registro/login (RFC 5321 max = 254) */
export const emailField = () =>
  z.string().email('Ingrese un email válido').max(30, 'El email no puede exceder 30 caracteres');

/** Email opcional (proveedores, empleados, etc.) */
export const emailOptionalField = () =>
  z
    .string()
    .email('Ingrese un email válido')
    .max(30, 'El email no puede exceder 30 caracteres')
    .optional()
    .or(z.literal(''));

/** Contraseña */
export const passwordField = () =>
  z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede exceder 72 caracteres')
    .refine((v) => !/\s/.test(v), 'La contraseña no puede contener espacios');

// ─── Contacto y ubicación ────────────────────────────────────────────────────

/** Teléfono colombiano (fijo o celular) — opcional */
export const phoneField = () =>
  z
    .string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .regex(/^[+\d\s()-]*$/, 'Solo se permiten dígitos, espacios, +, ( y )')
    .optional()
    .or(z.literal(''));

/** Dirección física */
export const addressField = () =>
  z.string().max(300, 'La dirección no puede exceder 300 caracteres').optional().or(z.literal(''));

// ─── Identificación tributaria ────────────────────────────────────────────────

/** NIT colombiano (puede incluir guión de verificación) */
export const taxIdField = () =>
  z
    .string()
    .min(1, 'El NIT/Tax ID es requerido')
    .max(20, 'El NIT no puede exceder 20 caracteres')
    .regex(/^[\d-]+$/, 'El NIT solo puede contener dígitos y guiones');

// ─── Códigos de producto ──────────────────────────────────────────────────────

/** Código de barras (EAN-8 a EAN-14, máximo 30 dígitos para flexibilidad) */
export const barcodeField = () =>
  z
    .string()
    .max(30, 'El código de barras no puede exceder 30 caracteres')
    .regex(/^\d*$/, 'El código de barras solo puede contener dígitos')
    .optional()
    .or(z.literal(''));

/** SKU interno */
export const skuField = () =>
  z.string().max(50, 'El SKU no puede exceder 50 caracteres').optional().or(z.literal(''));

// ─── Montos y cantidades ──────────────────────────────────────────────────────

/** Precio en pesos colombianos (string porque viene de input type=number) */
export const priceField = (label = 'El precio') =>
  z
    .string()
    .min(1, `${label} es requerido`)
    .refine((v) => {
      const n = parseFloat(v);
      return !isNaN(n) && n >= 0;
    }, `${label} debe ser un número mayor o igual a 0`)
    .refine((v) => {
      const n = parseFloat(v);
      return !isNaN(n) && n <= 999_999_999;
    }, `${label} excede el límite máximo permitido`);

/** Cantidad de inventario (entero no negativo) */
export const quantityField = (label = 'La cantidad') =>
  z
    .number({ invalid_type_error: `${label} debe ser un número` })
    .int(`${label} debe ser un número entero`)
    .min(1, `${label} debe ser al menos 1`)
    .max(99_999, `${label} excede el límite máximo`);

/** Umbral de stock (entero no negativo, puede ser 0) */
export const stockThresholdField = () =>
  z
    .string()
    .optional()
    .refine((v) => {
      if (!v) return true;
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 0 && n <= 99_999;
    }, 'El umbral debe ser un número entre 0 y 99.999');

// ─── POS — métodos de pago colombianos ───────────────────────────────────────

/** Catálogo de métodos de pago para Colombia */
export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta débito/crédito' },
  { value: 'NEQUI', label: 'Nequi' },
  { value: 'DAVIPLATA', label: 'Daviplata' },
  { value: 'TRANSFER', label: 'Transferencia bancaria' },
  { value: 'MIXED', label: 'Mixto' },
] as const;

export type PaymentMethodValue = typeof PAYMENT_METHODS[number]['value'];

/** Catálogo de bancos colombianos */
export const COLOMBIAN_BANKS = [
  { value: 'BANCOLOMBIA', label: 'Bancolombia' },
  { value: 'BANCO_BOGOTA', label: 'Banco de Bogotá' },
  { value: 'BBVA', label: 'BBVA' },
  { value: 'DAVIVIENDA', label: 'Davivienda' },
  { value: 'AV_VILLAS', label: 'AV Villas' },
  { value: 'BANCO_POPULAR', label: 'Banco Popular' },
  { value: 'ITAU', label: 'Itaú' },
  { value: 'SCOTIABANK', label: 'Scotiabank Colpatria' },
  { value: 'NEQUI_BANK', label: 'Nequi (Bancolombia)' },
  { value: 'OTROS', label: 'Otro banco' },
] as const;

/** Código de operación / referencia de pago */
export const operationCodeField = () =>
  z.string().min(1, 'El código de operación es obligatorio').max(50, 'El código no puede exceder 50 caracteres');

/** Monto recibido en efectivo */
export const cashAmountField = () =>
  z
    .string()
    .min(1, 'El monto es obligatorio')
    .refine((v) => {
      const n = parseFloat(v);
      return !isNaN(n) && n >= 0;
    }, 'El monto debe ser un número válido')
    .refine((v) => {
      const n = parseFloat(v);
      return !isNaN(n) && n <= 999_999_999;
    }, 'El monto excede el límite máximo');

// ─── Inventario ───────────────────────────────────────────────────────────────

/** Razón de movimiento de stock (entrada/salida/ajuste) */
export const movementReasonField = () =>
  z.string().min(1, 'La razón es requerida').max(200, 'La razón no puede exceder 200 caracteres');

// ─── Nombre de negocio ───────────────────────────────────────────────────────

/** Nombre de negocio para registro */
export const businessNameField = () =>
  z
    .string()
    .min(2, 'El nombre del negocio debe tener al menos 2 caracteres')
    .max(50, 'El nombre del negocio no puede exceder 50 caracteres');
