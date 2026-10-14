# Verificación en navegador · mobile-composer-telegram-style

Entorno: app local (Docker, rama `picnic/feat/mobile-composer-bar`), Chrome DevTools, 390×844 táctil (DPR 3) y 1440×900, conversación de prueba del inbox local. La grabación se hizo con un micrófono simulado (oscilador por `getUserMedia`) y nada se envió.

## Medido
- **Cápsula (reposo)**: un solo contenedor (`.reply-box`, radio 28 px) con `+`, editor, candado y micrófono; los cuatro con el mismo centro Y (806). Fondo gris suave (`n-slate-3`) distinguible del fondo de la conversación.
- **Mic → enviar**: vacío muestra el micrófono («Grabar audio»); con texto es la flecha de enviar.
- **Varias líneas**: con 4 líneas aparecen ✨ (arriba-izquierda) y expandir (arriba-derecha); `+`, candado y enviar abajo; en una línea no son visibles.
- **Expandido**: ✨ y contraer arriba, texto a ancho completo, `+`, candado y enviar abajo; contraer y borrar el texto vuelve a la cápsula de una línea (`data-grown` y `data-expanded` ausentes).
- **Grabadora (móvil y escritorio)**: barra de una fila con papelera, punto rojo, onda en vivo, tiempo, pausa y enviar. Pausar deja papelera, play, perilla de posición, «Grabar de nuevo» y enviar; tras el arreglo el tiempo (`00:02`) queda a la derecha de la barra (barra 92–246 px, tiempo 254–298 px). La papelera devuelve el compositor sin adjuntos.
- **Audios OGG/Opus en Safari (forzado)**: con `canPlayType('audio/ogg…')` devolviendo vacío, tocar play descarga el OGG (220 KB), lo decodifica a un WAV de 386 KB (12 s, mono 16 kHz) y se reproduce (`readyState` 4, duración 12.06 s, sin error). En Chrome normal no se genera ningún WAV.
- **Reproductor**: play redondo, 32 barras separadas con perilla, duración, velocidad, silencio y descarga.
- **Escritorio**: pestañas Responder/Nota privada y sin botón `+` en reposo; la barra de grabación es la misma de una fila.
- **Specs**: ReplyBox, WootWriter (incluye `AudioRecorder`), audio y `oggOpusFallback` en verde; lint limpio en lo tocado.

## No medido
- Safari/iPhone real: reproducción real de un OGG grabado en escritorio, `Audio.play()` en iOS, teclado, y la grabadora con el micrófono real (permiso y pausa).
- Arrastre de la perilla con el dedo (solo spec).
- Al pausar la grabación y reanudarla con el micrófono de la vista previa se descarta lo anterior (no se une).
