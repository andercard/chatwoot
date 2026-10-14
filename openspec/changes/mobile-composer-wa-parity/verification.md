# Verificación en navegador · mobile-composer-wa-parity

Entorno: app local (Docker, rama `picnic/feat/mobile-composer-bar` con `origin/production` mergeado), Chrome DevTools, viewport 390×844 touch (DPR 3), conversación de prueba del inbox local.

## Medido
- **Respuestas rápidas (`/`)**: lista a ancho completo sobre la barra con encabezado «Respuestas rápidas» y enlace «Editar»; cada fila muestra el atajo (sin `/`, p. ej. `confirmar-fecha`) arriba y el contenido abajo.
- **Menú `+`** (respuesta, WhatsApp): Fotos, Documento, Grabar audio, Macros, Activar firma, Plantillas de Whatsapp. No existe `#mobileCameraInput`; sí `#mobilePhotosInput`.
- **Barra de una línea**: la píldora mide 52 px (centro Y 810). Tras el ajuste `mb-2.5`, `+`, sparkle, maximizar, candado y enviar tienen centro Y 810 (diferencia 0 px). Antes del ajuste los de 32 px estaban en 814.
- **Maximizar visible** con el editor vacío y sin foco.
- **Escritorio (1440×900)**: pestañas Responder / Nota privada visibles, sin botón `+`.
- **Specs**: ReplyBox (94), WootWriter, PreviewPicker (6) y WaveformSeekBar (4) en verde; el spec de ReplyBox cubre enviar durante la grabación una sola vez y no enviar si la grabación falla.

## No medido (necesita micrófono o un audio real)
- Grabadora: layout de dos filas, onda de 2.5 rem, pausa real y que el tiempo se congele (no confirmado si wavesurfer deja de emitir progreso en pausa).
- Arrastre de la barra de audio con el dedo: cubierto por spec (arrastrar a la mitad emite ≈ 0.5; límites 0–1), sin audio de prueba en la conversación local.
- iPhone real (criterio C del plan).
