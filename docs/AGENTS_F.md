# VELTRO — Documentación del Proyecto

## Descripción General

**Veltro** es un sistema ERP/POS **multi-tenant** ligero para PYMEs que incluye:
- **Multi-tenant**: cada negocio tiene datos aislados (productos, inventario, ventas, etc.)
- Ventas con escaneo de código de barras (cámara + USB)
- Identificación de productos por IA (Arquitectura Híbrida: YOLO v8 + CLIP Zero-Shot)
- Inventario con alertas proactivas (sin stock, stock bajo, sobre-stock)
- Órdenes de compra con gestión de proveedores
- Dashboard con KPIs y exportación PDF/Excel
- Auditoría forense completa
- Roles: ADMIN, CASHIER, WAREHOUSE
- Registro de nuevos negocios + creación de trabajadores por ADMIN

**Stack Tecnológico:**
- **Backend**: Spring Boot 4.x + Java 21 + PostgreSQL 18 (pgvector)
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router
- **IA**: YOLOv8n (Detección local frontend) + CLIP (Embedding en backend via ONNX Runtime Java) + pgvector
- **Seguridad**: JWT con roles (ADMIN, CASHIER, WAREHOUSE) + tenant isolation por businessId

---

## Comandos de Build y Ejecución

### Entorno Local

```bash
# PostgreSQL 18 local
# DB: veltro_db | Usuario: postgres | Password: lolxd777
# Login app: admin2/admin123 (rol ADMIN, businessId=1)
# Segundo negocio: owner_test/test123 (ADMIN, businessId=2), cashier_test/test123 (CASHIER)

# Backend (puerto 8080)
"mvnw" clean package -DskipTests
nohup java -jar target/Veltro-0.0.1-SNAPSHOT.jar > target/backend.log 2>&1 &

# Frontend (puerto 5173)
cd frontend && nohup npm run dev > ../target/frontend.log 2>&1 &

# Matar Java antes de rebuild (Windows)
taskkill //F //IM java.exe

# TypeScript check
cd frontend && npx tsc --noEmit
```

### Rutas API Base
- Backend: `http://localhost:8080/api/v1/`
- Frontend: `http://localhost:5173`

---

## Arquitectura

### Backend — Hexagonal

```
src/
├── domain/              # Entidades, eventos, reglas de negocio (sin Spring)
│   ├── iam/            # User, Role
│   ├── catalog/        # Product, Category
│   ├── inventory/      # Inventory, InventoryMovement, Alert
│   ├── pos/            # Sale, SaleDetail, State Pattern
│   ├── purchasing/     # Supplier, PurchaseOrder, PurchaseOrderDetail
│   └── audit/          # AuditRecord
│
├── application/        # Servicios, listeners, strategies
│   ├── iam/           # AuthService, JwtTokenProvider
│   ├── catalog/       # ProductService, CategoryService
│   ├── inventory/     # InventoryService, AlertService, AlertChainBuilder
│   ├── pos/           # SaleService, DeductStockListener, RestoreStockListener
│   ├── purchasing/    # PurchaseOrderService, SupplierService
│   ├── scanner/       # ScannerService, VectorSearchStrategy, ClipInferenceService (ONNX)
│   └── audit/         # AuditCommandExecutor
│
└── infrastructure/     # Controllers REST, JPA repos, config
    ├── rest/          # @RestController (controladores delgados)
    ├── persistence/   # Repositorios JPA
    ├── config/        # Security, CORS, application.yaml
    └── db/migration/  # Flyway SQL (V1__* a V6__*)
```

### Frontend

```
frontend/src/
├── api/                  # Clientes HTTP (Axios + endpoints)
│   ├── client.ts        # Axios con interceptores JWT
│   ├── auth.ts          # Login, registro, cambio contraseña, crear trabajador
│   ├── catalog.ts       # Productos y categorías CRUD
│   ├── pos.ts           # Ventas, escáner IA, búsqueda productos
│   ├── inventory.ts     # Alertas de inventario
│   ├── purchasing.ts    # Órdenes de compra
│   ├── dashboard.ts     # KPIs y reportes
│   └── audit.ts         # Registros de auditoría
│
├── stores/              # Zustand
│   ├── authStore.ts     # Token JWT, usuario, rol, businessId, getBusinessId()
│   ├── cartStore.ts     # Carrito POS (Product, salePrice)
│   ├── alertStore.ts    # Alertas de inventario
│   └── aiScanStore.ts   # Estado del scanner IA (boxes YOLO, resultados CLIP)
│
├── hooks/              # useFocusTrap, useAuth, useAlerts
│   ├── useYoloDetection.ts   # YOLOv8n con ONNX Runtime Web (detección local)
│   └── useGeminiQueue.ts     # Cola de procesamiento de detecciones
│
├── modules/types/     # Tipos IA (YoloBox, GeminiResult, ScanMode, etc.)
│
├── components/
│   ├── auth/           # AuthGuard, RoleGuard
│   ├── layout/         # MainLayout (sidebar responsive, "Empleados" nav para ADMIN)
│   ├── catalog/        # CategoryTree, ProductScanner (cámara + IA)
│   ├── pos/            # ScannerContainer, CartTable, ConfirmModal, SaleReceipt, AiScannerContainer, AiIdentificationModal, AiResultsPanel
│   ├── inventory/      # AlertList, AlertConfigForm
│   ├── purchasing/     # PurchaseOrderForm, OrderList, ReceptionFlow
│   ├── dashboard/      # KPICards, LatestSalesTable, ExportButtons
│   └── audit/          # AuditTable, AuditFilters, DiffViewer
│
├── pages/
│   ├── auth/           # LoginPage, RegisterPage
│   ├── catalog/        # ProductListPage, ProductFormPage, CategoryPage
│   ├── pos/            # POSPage
│   ├── inventory/      # InventoryPage, AlertListPage
│   ├── purchasing/     # PurchaseOrderPage
│   ├── dashboard/      # DashboardPage
│   ├── audit/          # AuditListPage
│   └── settings/       # WorkersPage (crear CASHIER/WAREHOUSE)
│
├── types/              # TypeScript interfaces compartidos
├── App.tsx             # React Router + lazy loading
└── index.css           # Tailwind CSS v4 imports
```

---

## Arquitectura Multi-Tenant

### Modelo de Aislamiento

Cada negocio (business) tiene datos completamente aislados. El aislamiento se implementa mediante `business_id` en todas las tablas principales.

**Tablas con `business_id`:** users, categories, products, inventory, inventory_movements, alert_configuration, alert, supplier, purchase_order, sale, audit_record

**Tablas SIN `business_id`:** purchase_order_detail, sale_detail (heredan tenant de su padre PO/sale), business (tabla raíz)

**Constraints únicos per-tenant:**
- `(username, business_id)` — mismo username puede existir en distintos negocios
- `(barcode, business_id)`, `(sku, business_id)` — productos únicos por negocio
- `(tax_id, business_id)` — proveedores únicos por negocio
- `(order_number, business_id)`, `(sale_number, business_id)` — numeración por negocio
- `email` — globalmente único (para recuperación de contraseña)

### Auth Stack (JWT + Tenant)

```
Request → JwtAuthenticationFilter
  ├── Extrae JWT del header Authorization
  ├── JwtTokenProvider.extractClaims() → { sub, uid, bid, role }
  ├── Construye VeltroUserDetails(username, userId, businessId, authorities)
  └── SecurityContextHolder.setAuthentication(UsernamePasswordAuthenticationToken)

Service Layer → TenantContext (static utility)
  ├── TenantContext.getBusinessId() → Long
  ├── TenantContext.getUserId() → Long
  └── TenantContext.getUsername() → String
```

**Archivos clave:**
- `VeltroUserDetails.java` — extiende Spring `User` con `userId` + `businessId`
- `TenantContext.java` — utilidad estática que extrae tenant del SecurityContext
- `JwtTokenProvider.java` — embeds `bid` (businessId) y `uid` (userId) en access tokens
- `JwtAuthenticationFilter.java` — reconstruye `VeltroUserDetails` desde JWT claims

### JWT Token Claims

```json
{
  "sub": "admin2",
  "uid": 3,
  "bid": 1,
  "role": "ADMIN",
  "type": "ACCESS",
  "iat": 1774537249,
  "exp": 1774538149
}
```

### Login Response (POST /auth/login)
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "username": "admin2",
  "role": "ADMIN",
  "businessId": 1
}
```
**IMPORTANTE:** La respuesta es PLANA (no tiene objeto `user` anidado). El frontend construye el objeto `User` manualmente.

### Registro de Nuevo Negocio (POST /auth/register)
```json
{
  "username": "owner",
  "email": "owner@test.com",
  "password": "pass123",
  "businessName": "Mi Tienda"
}
```
Crea: 1) BusinessEntity, 2) UserEntity (ADMIN) vinculado al business.

### Crear Trabajador (POST /auth/workers) — Solo ADMIN
```json
{
  "username": "cashier1",
  "email": "cashier@test.com",
  "password": "pass123",
  "role": "CASHIER"
}
```
Crea un usuario en el mismo `businessId` del ADMIN autenticado. Roles válidos: CASHIER, WAREHOUSE.

### Patrón en Servicios

Todos los servicios siguen el mismo patrón para aislamiento de datos:

```java
// En cada método de servicio:
Long businessId = TenantContext.getBusinessId();

// Queries filtran por businessId:
productRepository.findAllByActiveTrueAndBusinessId(businessId, pageable);

// Al crear entidades, se asigna businessId:
entity.setBusinessId(businessId);
```

### Migración SQL

`V3__multi_tenant.sql` — Agrega:
- Tabla `business` (id, name, owner_id FK users, audit fields)
- Columna `business_id BIGINT NOT NULL` a todas las tablas principales
- Datos existentes asignados a business id=1 ("Negocio Principal")
- Constraints únicos actualizados a per-business

---

## Patrones de Diseño Implementados

| Patrón | Uso |
|--------|-----|
| **Multi-Tenant (Shared DB)** | Aislamiento por `business_id` en cada tabla, TenantContext estático |
| **State Pattern** | Ciclo de vida de Sale y PurchaseOrder (PENDING → COMPLETED → VOIDED) |
| **Observer Pattern** | Domain events → Listeners (SaleCompletedEvent → DeductStock) |
| **Chain of Responsibility** | Evaluación de alertas (OutOfStock → LowStock → Overstock) |
| **Strategy Pattern** | Scanner: BarcodeStrategy + AiVisionStrategy |
| **Factory Method** | Exportadores de reportes (PDF vs Excel) |
| **Command Pattern (Functional)** | AuditCommandExecutor con before/after snapshots |

---

## Integración IA — Escáner con Visión (YOLO + CLIP + pgvector)

### Arquitectura Híbrida IA

El sistema de visión de Veltro implementa una arquitectura híbrida de 3 capas:

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React + onnxruntime-web)                                 │
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │   YOLOv8n   │───▶│  Detección  │───▶│  Crop + WebP (0.7)     │ │
│  │  (ONNX Web) │    │   boxes     │    │  Envío a /vector-search │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘ │
│       30ms/frame           ~8fps            Compresión + Upload   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND (Spring Boot + ONNX Runtime Java)                         │
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │    CLIP     │───▶│  Embedding  │───▶│    pgvector search     │ │
│  │  (ViT-B/32) │    │   512D      │    │  Cosine similarity     │ │
│  │  ONNX Model │    └─────────────┘    └─────────────────────────┘ │
│  └─────────────┘           │                     │                │
│                             ▼                     ▼                │
│                    ┌─────────────────┐    ┌──────────────────┐   │
│                    │ Top-K matches   │    │ Product match    │   │
│                    │ (threshold)     │    │ (confidence)     │   │
│                    └─────────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Flujo Completo de Detección IA

1. **Detección (Frontend — YOLO)**
   - `useYoloDetection` corre YOLOv8n via ONNX Runtime Web (~30ms/frame, ~8fps)
   - Detecta objetos genéricos (80 clases COCO)
   - Tracking con EMA smoothing para estabilizar bounding boxes
   - Non-Maximum Suppression (NMS) para eliminar duplicados
   - Box colors según estado: gray (detectado), orange (en cola), green (confirmado), red (baja confianza)

2. **Captura de Imagen (Frontend)**
   - Usuario presiona "Escanear Principal" o "Escanear Todo"
   - Se recorta el frame del video al bounding box más prominente
   - Compresión a WebP calidad 0.7 para minimizar bandwidth
   - Envío via FormData a `POST /scanner/vector-search`

3. **Embedding (Backend — CLIP)**
   - Spring Boot recibe la imagen
   - ONNX Runtime Java ejecuta CLIP (ViT-B/32) para generar vector 512D
   - Modelo cargado desde `classpath:models/clip-image-vit-32.onnx`

4. **Búsqueda Vectorial (Backend — pgvector)**
   - Similitud del coseno (`<=>`) contra embeddings de productos
   - `ORDER BY embedding <=> query_vector LIMIT 5`
   - Umbral de confianza configurable (default 0.85)

5. **Respuesta y UI (Frontend)**
   - Top 5 coincidencias con scores de similitud
   - Si top confidence >= 0.9: auto-identificación (verde)
   - Si top confidence < 0.9: selección manual requerida (naranja)
   - Toast notifications con resultados

### Endpoints del Scanner

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/v1/scanner/vector-search` | POST (multipart) | Envía imagen recortada, retorna búsqueda vectorial CLIP |
| `/api/v1/scanner/status` | GET | Estado de estrategias (`{ BARCODE: true, VECTOR_SEARCH: true }`) |
| `/api/v1/scanner/ai/available` | GET | `{ available: boolean }` |

### Configuración (application.yaml)

```yaml
veltro:
  ai:
    enabled: true

    confidence-threshold: 0.85
    model-path: classpath:models/clip-image-vit-32.onnx
    max-image-size-kb: 50

    max-retries: 3
```

### Tipos Frontend (ai.types.ts)

```typescript
export type ScanMode = 'barcode' | 'ai';
export type AiUseCase = 'pos-sell' | 'inventory-count';
export type ResultStatus = 'pending' | 'processing' | 'done' | 'error' | 'low-confidence';

export interface YoloBox {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  className: string;
}

export interface GeminiResult {
  boxId: number;
  status: ResultStatus;
  isCertain: boolean;
  suggestions: ProductSuggestion[];
  productName?: string;
  productId?: number;
}

export interface ProductSuggestion {
  name: string;
  confidence: number;
  productId?: number;
  barcode?: string;
}
```

### Store de Estado IA (aiScanStore.ts)

Zustand store que maneja:
- `boxes`: Array de YoloBox detectados por YOLO
- `results`: Array de GeminiResult (resultados CLIP)
- `scanMode`: 'barcode' | 'ai'
- `aiUseCase`: 'pos-sell' | 'inventory-count'
- `selectedBoxIds`: Selección múltiple para escanear
- `isProcessing`: Estado de la cola

### Hooks de IA

**useYoloDetection.ts:**
- Carga modelo YOLOv8n desde `/model/yolov8n.onnx`
- ONNX Runtime Web con WebGPU/WASM fallback
- Preprocesamiento: scale + center a 640x640, normalización RGB
- Post-procesamiento: NMS, IoU matching, EMA smoothing
- Throttling: ~8fps para no saturar el navegador

**useGeminiQueue.ts:**
- Cola FIFO de detecciones a procesar
- Rate limiting (300ms delay entre requests)
- Retry automático (max 3 intentos)
- Crop de frames usando bounding box coordinates
- Compresión WebP 0.7 antes de envío

### Vite Config — Model Copy

El frontend copia modelos ONNX y archivos WASM al build:

```typescript
viteStaticCopy({
  targets: [
    { src: 'node_modules/onnxruntime-web/dist/ort-wasm*.wasm', dest: '.' },
    { src: 'node_modules/onnxruntime-web/dist/ort-wasm*.mjs', dest: '.' },
  ],
})
```

Modelos YOLO deben colocarse en `frontend/public/model/yolov8n.onnx`.

---

## Docker — Backend con ONNX Runtime Java

### Dockerfile del Backend

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN ./mvnw clean package -DskipTests

FROM eclipse-temur:21-jre-alpine
WORKDIR /app

# ONNX Runtime Java dependencies
RUN apk add --no-cache \
    libc6-compat \
    libgomp

# Copiar modelo CLIP
COPY --from=build /app/src/main/resources/models/clip-image-vit-32.onnx /app/models/

# Copiar JAR
COPY --from=build /app/target/Veltro-*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### docker-compose.yml (Full Stack)

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg18
    environment:
      POSTGRES_DB: veltro_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: lolxd777
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/veltro_db
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: lolxd777
      JWT_SECRET: <generate-with-openssl-rand-base64-64>
      CORS_ALLOWED_ORIGINS: http://localhost:5173
      VELTRO_AI_ENABLED: "true"
      VELTRO_AI_MODEL_PATH: classpath:models/clip-image-vit-32.onnx
      VELTRO_AI_CONFIDENCE_THRESHOLD: "0.85"
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      VITE_API_BASE_URL: http://localhost:8080/api/v1
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Dockerfile del Frontend

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf para SPA

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Init DB SQL (pgvector)

```sql
-- Habilitar extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla de productos con embedding (para CLIP)
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_embedding vector(512);

-- Índice para búsqueda vectorial
CREATE INDEX IF NOT EXISTS idx_products_embedding ON products USING hnsw (image_embedding vector_cosine_ops);

-- Función para buscar productos similares
CREATE OR REPLACE FUNCTION match_products(query_embedding vector(512), match_threshold float, match_count int)
RETURNS TABLE(id bigint, name text, similarity float) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, 1 - (p.image_embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE p.image_embedding <=> query_embedding < match_threshold
    AND p.active = true
  ORDER BY p.image_embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Formato de Respuestas Backend

### ProductResponse (GET /products, GET /products/barcode/{code})
Campos planos (sin objetos anidados):
```json
{
  "id": 1,
  "name": "Producto X",
  "barcode": "7750000000000",
  "sku": "SKU-001",
  "description": "...",
  "costPrice": "10.0000",
  "salePrice": "15.0000",
  "categoryId": 1,
  "categoryName": "Categoría A",
  "active": true,
  "minStockInfo": 20,
  "minStockWarning": 10,
  "minStockCritical": 5
}
```

### Auth Login (POST /auth/login)
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "username": "admin2",
  "role": "ADMIN",
  "businessId": 1
}
```
**Nota:** Respuesta plana — el frontend construye el objeto `User` manualmente.

### Inventory Adjustment (PUT /inventory/{id}/adjust)
```json
{ "newStock": 50, "reason": "Ajuste por conteo físico" }
```

### AI Vector Search Response (POST /scanner/vector-search)
```json
{
  "suggestions": [
    {
      "productId": 123,
      "productName": "Coca Cola 600ml",
      "confidence": 0.92,
      "barcode": "7750000000000",
      "suggestedName": null,
      "suggestedBarcode": null,
      "suggestedPrice": null
    }
  ],
  "processingTimeMs": 145,
  "strategyUsed": "VECTOR_SEARCH"
}
```

---

## Bugs Resueltos (Historial)

### Backend
1. `App.tsx` InventoryPage duplicado → corregido con Suspense
2. Audit `findByFilters` query → fix CAST para enums null
3. POS API path + quick sale → endpoint `POST /sales/quick` con `QuickSaleRequest`
4. Jackson LocalDateTime → `.toString()` en snapshots
5. Payment methods → YAPE/PLIN en lugar de CHECK
6. Product/Category delete → cambiado a PUT deactivate (soft delete)
7. PO `requested_by` NOT NULL → `UserRepository` + `SecurityContextHolder`
8. DB constraint `ck_alert_type` → ALTER CHECK para incluir 6 tipos

### Frontend
9. `SaleReceipt` → reescrito para matchear backend
10. Dashboard types → campos correctos
11. Category `getTree` → path corregido
12. `purchasing.ts` → reescritura completa (endpoints, tipos, creación multi-paso)
13. `inventory.ts` → paths de alertas corregidos
14. `auth.ts` → PUT change-password, campo currentPassword
15. `audit.ts` → export lanza error descriptivo
16. `PageResponse` → formato Spring Page
17. Páginas de purchasing (PurchaseOrderPage, OrderList, ReceptionFlow, PurchaseOrderForm) → reescritas
18. AlertList, alertStore, AlertConfigForm → conversiones string→number
19. AuditListPage → currentPage→number, manejo de error en export
20. POS barcode/salePrice → tipo Product corregido, cartStore usa `salePrice`
21. CartTable, ConfirmModal → `salePrice` en lugar de `price`
22. PO Supplier dropdown → `setValue` en lugar de evento DOM
23. ProductListPage → `overflow-x-auto`

### Responsive UI (Sesión 6)
24. PurchaseOrderPage → overflow-x-auto, header wrap
25. AuditListPage → overflow-x-auto, header wrap
26. OrderList → overflow-x-auto en items expandidos
27. ProductListPage → header wrap
28. POSPage → header wrap + md:grid-cols-2
29. CategoryPage → header wrap + lg:sticky
30. InventoryPage → flex-wrap, whitespace, bg-black/50 (Tailwind v4)
31. DashboardPage → md:grid-cols-2, flex-1 min-h-0
32. AuditFilters → grid-cols-1 sm:grid-cols-2
33. MainLayout → bg-black/60 (Tailwind v4)

### Integración IA/Cámara (Sesión 6-7)
34. `application.yaml` → Google AI API (gemini-2.5-flash)
35. `pos.ts` → tipos correctos, FormData upload, checkAiAvailable()
36. `AiIdentificationModal.tsx` → reescrito (Blob input, español, colores Veltro)
37. `ScannerContainer.tsx` → reescrito con html5-qrcode, timer 3s IA, captura frame
38. `ProductScanner.tsx` → NUEVO componente para formulario de catálogo
39. `ProductFormPage.tsx` → integración con ProductScanner (auto-fill campos)

### Scanner html5-qrcode + bugs corregidos (Sesión 8)
40. `ScannerContainer.tsx` → fix de lifecycle `html5-qrcode` (start/stop/clear sin carreras)
41. `ScannerContainer.tsx` → `start()` con `{ facingMode: 'environment' }` y cleanup garantizado al desmontar
42. `ScannerContainer.tsx` → feedback visual de transición/estado de cámara
43. `ProductScanner.tsx` → mismo fix de lifecycle + transición + cleanup robusto
44. `ProductScanner.tsx` → en lectura exitosa, detiene scanner antes de consultar backend
45. `ProductFormPage.tsx` → auto-fill obligatorio de `barcode` + cierre automático del scanner
46. `api/pos.ts` + `ConfirmModal.tsx` → NEQUI/DAVIPLATA se mantienen visibles; bloqueo amigable en UI por no disponibilidad
47. `cartStore.ts` + `ScannerContainer.tsx` + `POSPage.tsx` → control de stock en carrito + mensajes 422 legibles
48. `api/client.ts` → interceptor 401 no intercepta `/auth/login` (mensaje correcto en login)
49. `api/purchasing.ts` + `PurchaseOrderForm.tsx` → OffsetDateTime en fecha esperada + errores por etapa (crear orden/agregar ítem)
50. `stores/alertStore.ts` + `useAlerts.ts` + `AlertList*.tsx` + `api/inventory.ts` → separación `activeAlerts`/`unreadCount`, read vs resolve
51. `api/dashboard.ts` → tipos dashboard alineados (outOfStock list tipada y total tolerante `number|string`)
52. `ProductListPage.tsx` + `api/catalog.ts` → activar/desactivar con modal de confirmación (sin `window.confirm`)
53. `InventoryPage.tsx` → límites de stock robustos (`Sin máximo`) y estado de stock sin supuestos frágiles
54. `useGeminiQueue.ts` → Optimización de payload WebP (0.7) y cambio de endpoint a `/vector-search`.

### Arquitectura IA V2 (Sesión 9+)
55. **Arquitectura IA V2**: Migración de Gemini a YOLO + CLIP + pgvector (Inferencia 100% Java).
56. `AiScannerContainer.tsx` → Limitación a 1 escaneo por click ("Escanear Principal") para control de flujo.
57. `useYoloDetection.ts` → Implementación completa con tracking, EMA smoothing, NMS, IoU matching.
58. `aiScanStore.ts` → Estado centralizado para boxes, resultados, selección múltiple.
59. `ai.types.ts` → Tipos unificados para YoloBox, GeminiResult, ScanMode, AiUseCase.
60. **Dockerización**: Dockerfile backend con ONNX Runtime Java, docker-compose con pgvector.
61. **pgvector setup**: Índice HNSW para búsqueda vectorial, función `match_products`.

---

## Archivos Modificados — Referencia Rápida

### Backend
| Archivo | Cambio |
|---------|--------|
| `application.yaml` | Configuración IA (CLIP, umbrales, modelo ONNX) |
| `ScannerService.java` | Integración vector search con pgvector |
| `ClipInferenceService.java` | ONNX Runtime Java para embeddings CLIP |
| `VectorSearchStrategy.java` | Búsqueda por similitud del coseno |
| `V3__multi_tenant.sql` | Migración multi-tenant (business table, business_id columns) |

### Frontend — AI System
| Archivo | Descripción |
|---------|-------------|
| `hooks/useYoloDetection.ts` | YOLOv8n con ONNX Runtime Web, tracking, EMA smoothing |
| `hooks/useGeminiQueue.ts` | Cola FIFO, rate limiting, retry, crop + WebP |
| `stores/aiScanStore.ts` | Estado centralizado IA (boxes, results, selection) |
| `modules/types/ai.types.ts` | YoloBox, GeminiResult, ScanMode, ProductSuggestion |
| `components/pos/AiScannerContainer.tsx` | Video + canvas overlay + toasts + resultados |
| `components/pos/AiResultsPanel.tsx` | Panel de resultados IA por caso de uso |
| `components/pos/AiIdentificationModal.tsx` | Modal para selección manual de productos |
| `vite.config.ts` | Copia de archivos WASM y ONNX al build |

### Frontend — API
| Archivo | Descripción |
|---------|-------------|
| `api/pos.ts` | aiScanProduct (FormData), checkAiAvailable, ProductSuggestionResponse |

---

## Sobre el Hitbox del Escáner

El área de detección de la cámara (hitbox) se puede modificar en dos niveles:

### 1. Guía visual (overlay CSS)
En `AiScannerContainer.tsx`, el rectángulo es solo una guía visual para posicionar el producto.

### 2. Área de decodificación real (html5-qrcode)
Para barcode scanning, `ScannerContainer.tsx` y `ProductScanner.tsx` usan `qrbox` dinámico.

---

## Despliegue en Producción (Docker + Cloud)

### Arquitectura de Despliegue

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DOCKER COMPOSE                              │
│                                                                      │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────────────┐   │
│  │ postgres │◄───│   backend    │───►│      frontend           │   │
│  │ pgvector │    │ Spring Boot  │    │  (nginx static files)   │   │
│  │   :5432  │    │   :8080      │    │      :80                │   │
│  └──────────┘    └──────────────┘    └─────────────────────────┘   │
│       │                  │                       │                   │
│       └──────────────────┴───────────────────────┘                   │
│                          │                                           │
│                  Puertos expuesta                                   │
│                   :5432, :8080, :80                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Variables de Entorno para Producción

**PostgreSQL:**
- `POSTGRES_DB`: veltro_db
- `POSTGRES_USER`: postgres
- `POSTGRES_PASSWORD`: <generar-segura>

**Backend:**
- `SPRING_DATASOURCE_URL`: jdbc:postgresql://postgres:5432/veltro_db
- `JWT_SECRET`: <openssl rand -base64 64>
- `VELTRO_AI_ENABLED`: true
- `VELTRO_AI_CONFIDENCE_THRESHOLD`: 0.85

**Frontend:**
- `VITE_API_BASE_URL`: https://api.tu-dominio.com/api/v1

### Checklist Pre-Deploy

- [ ] `JWT_SECRET` generado y configurado
- [ ] Modelo CLIP (`clip-image-vit-32.onnx`) en resources/models/
- [ ] `SPRING_DATASOURCE_URL` apunta al contenedor PostgreSQL
- [ ] CORS configurado para dominios de producción
- [ ] pgvector extension habilitada en la base de datos
- [ ] Índice HNSW creado para búsqueda vectorial
- [ ] Verificar que YOLOv8n está en `frontend/public/model/yolov8n.onnx`
- [ ] Probar flujo completo: detección → crop → CLIP → pgvector → respuesta

---

**Última actualización:** Mayo 2026
**Estado Backend:** 100% funcional — multi-tenant + CLIP/pgvector
**Estado Frontend:** 100% funcional — YOLO + CLIP + multi-tenant + registro + workers
**TypeScript:** 0 errores (`tsc --noEmit`)
**Docker:** Backend + Frontend + PostgreSQL con pgvector
**IA:** YOLO (frontend) + CLIP (backend ONNX) + pgvector (búsqueda vectorial)