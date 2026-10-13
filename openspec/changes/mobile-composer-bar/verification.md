# Verificación en navegador · mobile-composer-bar

Entorno: app local (Docker, rama `picnic/feat/mobile-composer-bar`), Chrome DevTools, viewport 390×844 touch (DPR 3), conversación de prueba del inbox local. Teclado simulado forzando `visualViewport.height = 420`. Las pruebas de envío se hicieron en **nota privada** (no sale nada a WhatsApp). Pendiente aparte: iPhone real (criterio C del plan).

## Barra compacta (390 px)
- `.reply-box` es `display: grid` con columnas `32px 32px 246px 40px`. Botones visibles, misma base (±4 px): `+` (8–40 / 804–836), sparkle (48–80 / 804–836), maximizar (262–294 / 800–832), candado (298–330 / 800–832), enviar (342–382 / 796–836). La píldora mide 44 px de alto vacía.
- Maximizar y candado van lado a lado en compacto (se solapaban en la primera versión; corregido). Placeholder en una línea con puntos suspensivos (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`).

## Listas @ y /
- `/`: lista de 29 filas (de canned responses) a ancho completo (0–390), `top 608 / bottom 776`, justo encima de la barra (`top 775`); sin campo de búsqueda; el foco sigue en `.ProseMirror`.
- Escribir `pago` tras `/`: la lista se filtra a 5 filas (`/confirmar-pago`, `/metodos-pago`, …).
- Tocar una fila: inserta `[CMD] confirmar-pago `, la lista se cierra y el foco sigue en el editor.
- `@` en nota privada: lista de agentes (Asesor local, Bot local, John, …) con el mismo tamaño y posición, sin búsqueda, foco en el editor.

## Candado, menú +, enviar, expandir
- Tocar el candado pasa a nota privada: píldora `rgb(255, 228, 181)` y botón enviar `rgb(255, 197, 61)` (ámbar); el contenedor se queda neutro (`rgb(255, 255, 255)`).
- Menú `+` en nota: Fotos, Cámara, Adjuntar archivos. En respuesta: Fotos, Cámara, Adjuntar archivos, Grabar audio, Macros, Activar firma, Plantillas de Whatsapp. Entradas de archivo creadas: `mobilePhotosInput` (`image/jpeg,image/png,video/3gp,video/mp4`), `mobileCameraInput` (`image/jpeg,image/png`, `capture=environment`), `conversationAttachment`.
- Enviar redondo: con el texto `nota de prueba móvil` en nota privada creó el mensaje (mensajes 20 → 21), el editor quedó vacío y volvió a 44 px.
- Maximizar: `data-expanded="true"` y la píldora pasó de 44 a 374 px; tras enviar `data-expanded` desaparece y vuelve a 44 px.

## Escritorio (1440×900)
`.reply-box` sigue `display: block`, con las pestañas Responder / Nota privada visibles, sin botón `+`, y `/` abre el selector flotante (`position: fixed`, con campo de búsqueda).

## No cubierto / desviaciones
- "Pedir datos de contacto" no pasó a fila del menú `+`: `RequestContactInfoButton.vue` guarda su condición y su acción dentro del componente. Sigue como botón en la fila 2 de la cuadrícula móvil (ver tarea 5).
- No se vio la fila "Macros": se muestra siempre en respuesta (no depende de `enableMacros`) y `openMacros` inserta `#` en el editor; no se confirmó en ejecución que ese `#` abra la lista de macros.
- Los botones de reproducir/pausa de la grabación y videollamada quedan en la fila 2 de la cuadrícula; no se probaron.
- Falta la prueba en iPhone real (teclado real, selectores de archivos nativos).
