# Tareas · mobile-composer-telegram-style

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más.


- [x] **1 · Reproductor estilo Telegram**
  - archivos: `app/javascript/dashboard/components-next/audio/WaveformSeekBar.vue`, `app/javascript/dashboard/components-next/audio/WaveformSeekBar.spec.js`, `app/javascript/dashboard/components-next/message/chips/Audio.vue`, `app/javascript/dashboard/components-next/audio/AudioPlayer.vue`
  - depende de: ninguna
  - listo cuando: la burbuja de audio muestra en una fila play/pausa **redondo** (≈2.5 rem), la barra de segmentos con **perilla** que se arrastra (progreso lleno, resto tenue) y la duración (transcurrido mientras suena, total en reposo), más el chip de velocidad a la derecha; silencio y descarga quedan accesibles sin ocupar la fila principal (icono pequeño o menú); sin texto fijo; la barra conserva `role="slider"`, arrastre por puntero y teclado; el spec cubre la perilla en la posición del progreso y el límite 0–1; `AudioPlayer.vue` usa la misma barra
  - commit: `feat(audio): Telegram-style voice player`

- [x] **2 · Audios OGG/Opus que suenan en Safari**
  - archivos: `package.json`, `pnpm-lock.yaml`, `app/javascript/dashboard/helper/oggOpusFallback.js`, `app/javascript/dashboard/helper/specs/oggOpusFallback.spec.js`, `app/javascript/dashboard/components-next/message/chips/Audio.vue`
  - depende de: 1
  - listo cuando: existe `oggOpusFallback.js` con `needsOpusFallback(type)` (verdadero si el tipo es OGG/Opus y `canPlayType('audio/ogg; codecs=opus')` es vacío) y `toPlayableUrl(url)` (descarga el archivo, decodifica con `ogg-opus-decoder` importado dinámicamente, devuelve la URL de un WAV mono 16 kHz/16 bits); `chips/Audio.vue` lo usa solo si `needsOpusFallback` y mientras convierte muestra el botón de play con estado de carga, y si falla muestra el botón de descargar; en navegadores que reproducen OGG el módulo y el decodificador **no se descargan** (import dinámico); `package.json` fija `ogg-opus-decoder` con versión exacta; el spec cubre: sin soporte llama al decodificador y devuelve un WAV con cabecera `RIFF`, con soporte no lo carga
  - commit: `feat(audio): play OGG/Opus voice notes in Safari`

- [x] **3 · Cápsula única en móvil: + / texto / candado / mic-enviar**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`, `app/javascript/dashboard/components/widgets/WootWriter/ReplyTopPanel.vue`, `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: ninguna
  - listo cuando: bajo 640 px y en reposo (una línea) existe una **única cápsula** (`.reply-box`, fondo propio, radio completo, ámbar en nota privada) y dentro de ella, en una misma fila y con el mismo centro vertical (±1 px): `+`, el editor, el candado y el botón redondo de la derecha; ✨ IA, maximizar, emoji y atajos no se ven; con el editor vacío y sin adjuntos el botón redondo es un **micrófono** que empieza la grabación (`toggleAudioRecorder`, solo si `showAudioRecorderButton`), con texto o adjuntos es la flecha de enviar; «Grabar audio» ya no está en el menú `+` en móvil; la cápsula ocupa el ancho disponible con el respiro de `env(safe-area-inset-bottom)` y no tiene borde ni margen extra fuera de la cápsula; en >= 640 px nada cambia; `ReplyBox.spec.js` sigue en verde
  - commit: `feat(mobile): single capsule composer with mic and send`

- [x] **4 · Varias líneas y expandido con ✨ y expandir arriba**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/ResizableEditorWrapper.vue`, `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`, `app/javascript/dashboard/components/widgets/WootWriter/ReplyTopPanel.vue`, `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`
  - depende de: 3
  - listo cuando: bajo 640 px `ResizableEditorWrapper` marca `data-grown` cuando el contenido ocupa más de una línea (se quita al volver a una); con `data-grown` la cápsula pasa a dos filas: arriba-izquierda ✨ IA y arriba-derecha el botón de expandir, el texto en el centro y abajo `+`, candado y enviar (el botón redondo pasa a flecha de enviar si hay texto); expandir lleva a la caja de hoy (`data-expanded`, de dos filas) con ✨ y contraer arriba dentro de la caja y `+`, candado y enviar abajo; sin varias líneas ✨ y expandir no existen en el DOM visible; contraer o enviar vuelve a la cápsula de una línea; en >= 640 px nada cambia; `ReplyBox.spec.js` sigue en verde
  - commit: `feat(mobile): grown and expanded capsule states`

- [x] **5 · Grabadora estilo Telegram con vista previa**
  - archivos: `app/javascript/dashboard/components/widgets/WootWriter/AudioRecorder.vue`, `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`, `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`, `app/javascript/dashboard/components/widgets/conversation/specs/ReplyBox.spec.js`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: 4, 1
  - listo cuando: mientras graba, en móvil y en escritorio, el editor se reemplaza por una barra compacta de una fila con `[papelera] [● punto rojo + onda en vivo + tiempo] [pausa] [enviar]` (onda de ≈2 rem de alto, no de 100 px); el compositor completo (+, ✨, candado, expandir) se oculta mientras graba; **pausa** detiene la grabación y muestra la vista previa `[papelera] [▶ onda con perilla + tiempo] [mic] [enviar]`, donde play reproduce el audio grabado y la perilla se arrastra (usa `WaveformSeekBar`); el mic de la vista previa descarta lo grabado y empieza otra grabación; la papelera descarta sin adjuntar; enviar (grabando o en vista previa) deja el adjunto listo y envía una sola vez, y no envía si la grabación falla; botones con `aria-label` por i18n (`REPLYBOX.AUDIO.DELETE/PAUSE/PLAY/RECORD_AGAIN/SEND`); las funciones de grabar y enviar de escritorio siguen disponibles (el compositor de escritorio sale de la barra solo mientras graba); el spec cubre: pausar detiene la grabación y habilita la vista previa, enviar en vista previa envía una vez
  - commit: `feat(composer): Telegram-style voice recorder with preview`

- [ ] **6 · Evidencia en navegador y delta de specs**
  - archivos: `openspec/changes/mobile-composer-telegram-style/proposal.md`, `openspec/changes/mobile-composer-telegram-style/tasks.md`, `openspec/changes/mobile-composer-telegram-style/specs/mobile-composer/spec.md`, `openspec/changes/mobile-composer-telegram-style/verification.md`
  - depende de: 1, 2, 3, 4, 5
  - listo cuando: el change tiene `proposal.md` (Rama y Base), `tasks.md`, el delta `specs/` con requisitos ADDED/MODIFIED y escenarios, y `verification.md` con las medidas hechas en 390×844 táctil: (a) un solo contenedor contiene `+`, editor, candado y mic con el mismo centro Y (±1 px); (b) el botón de la derecha cambia de mic a flecha al escribir; (c) ✨ y expandir solo con varias líneas; (d) expandido: ✨ y contraer arriba, `+`, candado y enviar abajo; (e) grabadora: barra de una fila, pausa y vista previa (con micrófono falso de Chrome `--use-fake-device-for-media-stream` si hay), un solo envío; (f) reproductor: perilla y arrastre cambian `currentTime`; (g) a 1440×900 el compositor es el de hoy; y lo que no se pudo medir queda dicho
  - commit: `docs(openspec): add the Telegram-style composer change`

