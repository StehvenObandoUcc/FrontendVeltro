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
