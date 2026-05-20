import { apiClient } from './client';

/**
 * Envía una imagen y coordenadas al backend proxy para segmentación con SAM (DigitalOcean).
 * 
 * @param imageFile Blob con el recorte de la imagen a segmentar
 * @param coordX Coordenada X relativa al recorte
 * @param coordY Coordenada Y relativa al recorte
 * @returns Base64 de la máscara si es exitoso, undefined en caso de error
 */
export async function segmentWithAI(imageFile: Blob, coordX: number, coordY: number): Promise<string | undefined> {
  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("x", coordX.toString());
  formData.append("y", coordY.toString());

  try {
    // Petición al backend Spring Boot (Proxy), no a DigitalOcean directamente
    const response = await apiClient.post('/scanner/segment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = response.data;
    if (data.estado === "éxito" && data.mascara_base64) {
      return data.mascara_base64;
    } else {
        console.warn("Backend retornó estado fallido para segmentación SAM:", data);
        return undefined;
    }
  } catch (error) {
    console.error("Error al conectar con el Backend (SAM proxy):", error);
    // Retornamos undefined para que el hook lo maneje como fallido
    return undefined;
  }
}
