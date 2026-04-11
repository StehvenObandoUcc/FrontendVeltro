# Análisis: Integración y Adaptación de YOLO en Proyecto Veltro

## 1. ¿Qué es YOLO?
**YOLO (You Only Look Once)** es una familia de modelos de Inteligencia Artificial especializados en **detección de objetos en tiempo real**. A diferencia de otros modelos que escanean una imagen varias veces, YOLO divide la imagen en una cuadrícula y predice las cajas delimitadoras (bounding boxes) y las probabilidades de clase en **una sola pasada**, lo que lo hace increíblemente rápido y apto para procesar video en tiempo real.

**Novedades:** Recientemente, la versión más avanzada es **YOLO26** (junto con YOLO11 de Ultralytics). Estas versiones están altamente optimizadas para correr en dispositivos Edge (celulares, tablets, navegadores) utilizando CPU o WebGPU sin sacrificar tanta precisión.

---

## 2. Estado Actual de YOLO en Veltro
Al revisar el código del proyecto (específicamente en `Veltro-Solo-Frontend/frontend/src/hooks/ai/`), he encontrado que **YOLO ya está parcialmente implementado**:

*   **Archivo `useObjectDetection.ts`:** Utiliza la librería `onnxruntime-web` para cargar un modelo llamado `yolov8n.onnx` (YOLO versión 8 Nano) y ejecutarlo directamente en el navegador del usuario.
*   **Funcionamiento Actual:** Este modelo dibuja las cajas (hitboxes) sobre los objetos que ve en la cámara.
*   **El Cuello de Botella (`useVisionQueue.ts`):** Actualmente, YOLOv8n solo se usa para *encontrar* dónde hay un objeto genérico. Luego, el programa recorta ese pedacito de video y lo envía al backend (`/scanner/ai`), el cual parece comunicarse con **Gemini** para preguntarle: *"¿Qué producto es este?"*. Esto es **muy lento** (tiene un timeout de 120 segundos) y puede resultar costoso.

---

## 3. ¿Cómo Adaptar YOLO de Forma Definitiva a Veltro?
Para que el sistema de inventario o Punto de Venta (POS) sea verdaderamente rápido e independiente de Gemini para cada escaneo, la adaptación debe enfocarse en **Entrenar un Modelo YOLO Personalizado**.

Aquí están los pasos técnicos para adaptarlo correctamente:

### A. Eliminar la dependencia de Gemini para clasificación
El modelo genérico de YOLOv8 detecta unas 80 clases comunes (persona, carro, botella, manzana). Necesitamos que detecte **los productos exactos de Veltro** (ej. "Coca Cola 600ml", "Lays Clásicas", etc.).

### B. Flujo de Adaptación Propuesto
1.  **Recolección de Datos (Dataset):** Tomar fotos o videos cortos de los productos del inventario de Veltro en diferentes ángulos, iluminación y fondos.
2.  **Etiquetado:** Usar herramientas como **Roboflow** para dibujar las cajas sobre los productos y etiquetarlos con el ID del producto o su nombre.
3.  **Entrenamiento:** Entrenar un modelo **YOLO11 Nano** o **YOLO26 Nano** usando Ultralytics con este dataset. Estos modelos son perfectos porque son ligeros y correrán muy rápido en el navegador de los clientes.
4.  **Exportación:** Exportar el modelo entrenado a formato **ONNX** (`modelo_veltro.onnx`).
5.  **Reemplazo en el Código:** 
    *   Subir `modelo_veltro.onnx` a la carpeta `public/model/` del frontend.
    *   Modificar `useObjectDetection.ts` para que cargue este nuevo modelo.
    *   Actualizar la lógica: En lugar de enviar la imagen recortada a Gemini, **el mismo modelo YOLO nos dirá la clase exacta del producto**.
    *   Podemos eliminar o reducir drásticamente el uso de `useVisionQueue.ts`, ya que las detecciones ahora tomarán **~30 milisegundos** en lugar de segundos, haciendo el escaneo instantáneo.

> [!TIP]
> **Veredicto:** El código base actual tiene una excelente arquitectura para usar IA en el frontend mediante WebAssembly y WebGPU. La mejor adaptación para "Veltro" es sustituir el flujo actual (YOLO genérico + Gemini) por un **YOLO entrenado específicamente con el catálogo de la tienda**, procesando el 100% de la visión de forma local (Offline) y a tiempo real.
