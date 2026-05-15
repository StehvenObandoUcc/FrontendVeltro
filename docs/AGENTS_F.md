# VELTRO - Guia de Analisis por Partes

## Objetivo

Este documento sirve para analizar el proyecto por secciones, identificar oportunidades de optimizacion y revisar el codigo sin tocar la implementacion del frontend.

## Alcance

- Solo documentacion.
- No modifica archivos de `src/`.
- No propone cambios directos en el frontend aqui; solo organiza el analisis.

## Resumen Del Proyecto

Veltro es una aplicacion frontend en React + TypeScript enfocada en ERP/POS. El codigo esta organizado por capas funcionales: bootstrap, API, estado, hooks, componentes, paginas, tipos y pruebas.

## Mapa General Del Proyecto

### Raiz

- `index.html`: punto de entrada de Vite.
- `vite.config.ts`: configuracion de build.
- `vitest.config.ts`: configuracion de pruebas.
- `eslint.config.js`: reglas de lint.
- `package.json`: scripts y dependencias.
- `vercel.json`: despliegue.

### `src/`

- `main.tsx`: arranque de React.
- `App.tsx`: router principal y layout base.
- `GlobalErrorBoundary.tsx`: captura de errores globales.
- `api/`: clientes HTTP y endpoints.
- `stores/`: estado global con Zustand.
- `hooks/`: hooks reutilizables.
- `components/`: componentes por dominio.
- `pages/`: pantallas completas.
- `types/` y `modules/types/`: contratos TypeScript.
- `test/`: pruebas unitarias e integracion.

## Analisis Del Codigo Por Partes

### Parte 1 - Bootstrap Y Enrutamiento

Archivos clave:

- `src/main.tsx`
- `src/App.tsx`
- `src/GlobalErrorBoundary.tsx`

Que revisar:

- Flujo de inicializacion.
- Carga de rutas.
- Manejo de errores de aplicacion.
- Separacion entre layout global y pantallas.

### Parte 2 - Capa De API

Carpeta:

- `src/api/`

Archivos:

- `client.ts`
- `auth.ts`
- `catalog.ts`
- `inventory.ts`
- `purchasing.ts`
- `pos.ts`
- `dashboard.ts`
- `audit.ts`
- `index.ts`

Que revisar:

- Consistencia de endpoints.
- Manejo de errores y respuestas.
- Reuso del cliente HTTP.
- Formato de request/response.
- Acoplamiento con los stores y paginas.

### Parte 3 - Estado Global

Carpeta:

- `src/stores/`

Archivos:

- `authStore.ts`
- `cartStore.ts`
- `alertStore.ts`
- `aiScanStore.ts`

Que revisar:

- Responsabilidad de cada store.
- Persistencia y sincronizacion.
- Riesgo de duplicacion de estado.
- Derivados computados y mutaciones.

### Parte 4 - Hooks Reutilizables

Carpeta:

- `src/hooks/`

Archivos:

- `useAuth.ts`
- `useAlerts.ts`
- `useCart.ts`
- `useFocusTrap.ts`
- `useAiScanQueue.ts`
- `useYoloDetection.ts`
- `index.ts`

Que revisar:

- Hooks con logica pesada.
- Dependencias entre hooks y stores.
- Separacion entre UI y logica.
- Posibles optimizaciones de render y memoria.

### Parte 5 - Componentes Por Dominio

Carpeta:

- `src/components/`

Subcarpetas:

- `auth/`
- `layout/`
- `catalog/`
- `pos/`
- `inventory/`
- `purchasing/`
- `dashboard/`
- `audit/`

Que revisar:

- Reutilizacion entre componentes.
- Componentes con demasiada logica.
- Division entre contenedores y presentacionales.
- Props demasiado grandes o acoplamiento con API/store.

### Parte 6 - Paginas

Carpeta:

- `src/pages/`

Subcarpetas:

- `auth/`
- `landing/`
- `catalog/`
- `pos/`
- `inventory/`
- `purchasing/`
- `dashboard/`
- `audit/`
- `settings/`

Que revisar:

- Carga por pagina y lazy loading.
- Paginas que mezclan demasiadas responsabilidades.
- Relacion con componentes y hooks.
- Posibles puntos de fragmentacion para optimizar.

### Parte 7 - Tipos Y Contratos

Carpetas:

- `src/types/`
- `src/modules/types/`

Archivos:

- `src/types/index.ts`
- `src/modules/types/ai.types.ts`

Que revisar:

- Tipos compartidos vs locales.
- Nombres consistentes.
- Reglas para evitar duplicacion de interfaces.

### Parte 8 - Pruebas

Carpeta:

- `src/test/`

Archivos relevantes:

- `setup.ts`
- `mswServer.ts`
- `mswHandlers.ts`
- `integration.test.ts`
- `api/client.test.ts`
- `stores/cartStore.test.ts`
- `components/*/*.test.tsx`

Que revisar:

- Cobertura por modulo.
- Pruebas de integracion vs unitarias.
- Casos fragiles o acoplados a implementacion.

## Orden Sugerido De Analisis

1. `src/main.tsx`, `src/App.tsx`, `src/GlobalErrorBoundary.tsx`
2. `src/api/`
3. `src/stores/`
4. `src/hooks/`
5. `src/components/`
6. `src/pages/`
7. `src/types/` y `src/modules/types/`
8. `src/test/`

## Preguntas Guía Para Optimizar

- Que codigo se repite y puede consolidarse.
- Que componentes hacen demasiadas cosas.
- Que hooks o stores disparan renders innecesarios.
- Que endpoints o contratos estan duplicados.
- Que partes conviene medir antes de refactorizar.

## Nota Importante

El frontend no se modifica en este documento. La idea es usar esta division para revisar el codigo por bloques y decidir despues donde conviene optimizar.

## Estado Del Proyecto

- Frontend: React + TypeScript + Vite.
- Estructura: modular por dominio.
- Proposito de este archivo: servir como mapa de analisis.

---

## Mejoras Implementadas (Partes 1-8)

Esta seccion documenta las mejoras aplicadas al codebase como resultado de los analisis por partes.

### Parte 1 — Bootstrap y Enrutamiento

| Hallazgo | Accion | Estado |
|---|---|---|
| Lazy loading de paginas | Implementado en App.tsx con `lazy()` y `Suspense` | ✅ |
| Doble Suspense (global + rutas protegidas) | Correccion del flujo de carga | ✅ |

### Parte 2 — Capa De API

| Hallazgo | Accion | Estado |
|---|---|---|
| `err: any` → `err: unknown` | Tipado seguro en catch blocks | ✅ |
| Imports con `import type` | Uso consistente de type-only imports | ✅ |
| Inline response types en auth.ts | Extraidos a `ApiSuccessResponse` y `CreateWorkerResponse` | ✅ |

### Parte 3 — Estado Global

| Hallazgo | Accion | Estado |
|---|---|---|
| `useCartStore()` sin selectores | Corregido con selectors para evitar re-renders | ✅ |
| Selectores en `alertStore` | Uso correcto de `useAlertStore((s) => ...)` | ✅ |

### Parte 4 — Hooks Reutilizables

| Hallazgo | Accion | Estado |
|---|---|---|
| `useCartStore()` re-renders | Selector pattern aplicado en POSPage | ✅ |
| `console.log` de debug | Eliminados en hooks AI | ✅ |

### Parte 5 — Componentes Por Dominio

| Hallazgo | Accion | Estado |
|---|---|---|
| ConfirmDialog reutilizable | Creado en `components/common/` | ✅ |
| `window.confirm()` nativo | Reemplazado por `ConfirmDialog` en POSPage, SupplierPage, CategoryPage | ✅ |

### Parte 6 — Paginas

| Hallazgo | Accion | Estado |
|---|---|---|
| `InventoryPage` mega-componente (557L) | Extraidos `StockMovementModal` y `MovementHistoryModal` | ✅ |
| `filteredInventory` doble filtrado | Eliminado — usa `inventory` directamente | ✅ |
| `console.log` en ProductFormPage | Eliminado | ✅ |
| Comentarios en espanol en ProductFormPage | Traducidos a ingles | ✅ |
| `PricingSection.tsx` codigo muerto | Eliminado (218 lineas, 0 imports) | ✅ |
| `AuditListPage` UI text en ingles | Corregido a espanol | ✅ |
| `confirm()` nativo | Reemplazado por `ConfirmDialog` | ✅ |
| Hardcoded styles en WorkersPage | Design tokens aplicados | ✅ |
| `formatDate` duplicada | Extraida a `utils/format.ts` | ✅ |
| Lazy imports inconsistentes en App.tsx | Barrel exports utilizados | ✅ |
| `getRoleLabel(role: string)` | Tipado a `UserRole` en WorkersPage y MainLayout | ✅ |
| `getRedirectPathByRole(role: string)` | Tipado a `UserRole` en LoginPage | ✅ |

### Parte 7 — Tipos Y Contratos

| Hallazgo | Accion | Estado |
|---|---|---|
| `ApiResponse<T>` tipo muerto | Eliminado | ✅ |
| `Inventory` tipo muerto | Eliminado | ✅ |
| `LoginResponse`/`RefreshResponse` duplicados | Unificados con `AuthTokenResponse` base + aliases | ✅ |
| `Worker.role: string` → `UserRole` | Cascade completo (types, authApi, WorkersPage) | ✅ |
| Inline response types en auth.ts | `ApiSuccessResponse` y `CreateWorkerResponse` compartidos | ✅ |
| Comentarios de seccion sin JSDoc | Migrados a JSDoc blocks | ✅ |
| `DetectMatch` duplicado de `MatchedProduct` | Alias `type DetectMatch = MatchedProduct` | ✅ |

### Parte 8 — Pruebas

| Hallazgo | Accion | Estado |
|---|---|---|
| MSW routes purchasing incorrectas | Corregidas 7 rutas (`purchasing/orders` → `purchase-orders`) | ✅ |
| MSW routes alerts incorrectas | Corregidas 2 rutas (`inventory/alerts` → `/alerts`) | ✅ |
| MSW routes POS incorrectas | Corregidas (`pos/sales` → `/sales/quick`) | ✅ |
| Endpoints POS ficticios | Eliminados handlers y tests para `GET /pos/sales` y `GET /pos/sales/:id` | ✅ |
| MSW Login response shape incorrecta | Alinearada con `LoginResponse` real (flat, no wrapper `user`) | ✅ |
| MSW Refresh response incompleta | Agregados campos faltantes (`tokenType`, `expiresIn`, etc.) | ✅ |
| MSW Dashboard response shape diverge | Corregidos tipos (`todaySales: string`, `cashierId`, `todaySalesCount`, etc.) | ✅ |
| 2 tests RBAC placeholder | Eliminados (`expect(true).toBe(true)`) + TODO comment | ✅ |
| `: any` types en tests | Reemplazados con tipos especificos | ✅ |
| Cobertura instalada | `coverage-v8` configurado | ✅ |

---

## Resumen de Archivos Modificados por Parte

| Parte | Archivos principales tocados |
|---|---|
| 2 | `api/auth.ts`, `api/client.ts` |
| 3 | `stores/cartStore.ts`, `stores/alertStore.ts` |
| 4 | `hooks/useAiScanQueue.ts` |
| 5 | `components/common/ConfirmDialog.tsx` (NEW), `pages/pos/POSPage.tsx`, `pages/purchasing/SupplierPage.tsx`, `pages/catalog/CategoryPage.tsx` |
| 6 | `pages/inventory/InventoryPage.tsx`, `components/inventory/StockMovementModal.tsx` (NEW), `components/inventory/MovementHistoryModal.tsx` (NEW), `pages/catalog/ProductFormPage.tsx`, `pages/audit/AuditListPage.tsx`, `pages/settings/WorkersPage.tsx`, `pages/ErrorPages.tsx`, `utils/format.ts` (NEW), `App.tsx`, `pages/landing/PricingSection.tsx` (DELETED) |
| 7 | `types/index.ts`, `api/pos.ts`, `hooks/useAiScanQueue.ts`, `api/auth.ts`, `pages/auth/LoginPage.tsx`, `components/layout/MainLayout.tsx` |
| 8 | `test/mswHandlers.ts`, `test/integration.test.ts`, `test/stores/cartStore.test.ts`, `package.json` |

---

## Hallazgos Pendientes (No Bloqueantes)

| # | Descripcion | Prioridad | Notas |
|---|---|---|---|
| P1 | Cobertura global ~3% | Baja | Deuda tecnica documentada en Part 8 |
| P2 | `eslint-disable` en 2 archivos (AiScannerContainer, DetectionOverlay) | Baja | Justificados por dependencias de useEffect |
| P3 | Tests para `authStore`, `WorkersPage`, `InventoryPage` no existen | Baja | Documentado en Part 8 H10 |

---

## Reglas de Idioma Aplicadas

| Tipo | Idioma | Ejemplo |
|---|---|---|
| Codigo (variables, funciones, hooks, componentes) | Ingles | `handleRoleChange`, `useCartStore`, `getRoleLabel` |
| Comentarios JSDoc | Ingles | `/** Shared token response returned by login and refresh endpoints. */` |
| UI strings (textos, placeholders, alerts) | Espanol | "Cajero", "Administrador", "Esta seguro de desactivar..." |
| Documentacion externa | Espanol | Este archivo, plans, handoffs |
