# Tareas · mobile-composer-wa-parity

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más.


- [x] **1 · Respuestas rápidas y listas de dos líneas en móvil**
  - archivos: `app/javascript/dashboard/components-next/preview-picker/PreviewPicker.vue`, `app/javascript/dashboard/components-next/preview-picker/PreviewPicker.spec.js`, `app/javascript/dashboard/components/widgets/conversation/CannedResponse.vue`, `app/javascript/dashboard/components-next/preview-picker/CaretAnchoredPicker.vue`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: ninguna
  - listo cuando: bajo 640 px y con `compact`, cada fila muestra el título arriba (`text-xs`, `text-n-slate-11`) y el subtítulo abajo (`text-sm`, `text-n-slate-12`, una línea con `truncate`), a ancho completo y con el separador actual; `CannedResponse` muestra el atajo **sin `/`** como título (la etiqueta con `/` sigue en `label` de escritorio) y un encabezado fijo «Respuestas rápidas» con un enlace «Editar» a `settings/canned-response` (nueva prop opcional `heading`/`editTo` en `PreviewPicker`, solo visible en `compact`); en escritorio el selector es idéntico a hoy; el spec cubre: en `compact` el título va sobre el subtítulo y aparece el encabezado cuando se pasa, y en escritorio no aparece
  - commit: `feat(mobile): quick replies as two-line rows with a heading`

- [ ] **2 · Menú +: Fotos nativo y Documento, sin Cámara**
  - archivos: `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: ninguna
  - listo cuando: bajo 640 px el menú `+` ya no tiene la fila «Cámara» ni el `FileUpload` `mobileCameraInput` (se eliminan `cameraFileTypes` y la llave `MOBILE_MENU.CAMERA` si nadie más las usa); «Fotos» sigue abriendo `mobilePhotosInput` (imagen+video del canal) y «Adjuntar archivos» se llama «Documento» (llave nueva `MOBILE_MENU.DOCUMENT`) y abre `conversationAttachment`; `>= 640 px` nada cambia
  - commit: `feat(mobile): plus menu keeps photos and document, drops the redundant camera row`

- [ ] **3 · Maximizar siempre visible y todo centrado con la píldora**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`, `app/javascript/dashboard/components/widgets/WootWriter/ReplyTopPanel.vue`, `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`
  - depende de: 2
  - listo cuando: bajo 640 px el botón de maximizar se ve siempre (con la píldora vacía y sin foco; en escritorio `showExpand` no cambia); con la píldora de una línea, el centro vertical de `+`, sparkle, enviar, candado y maximizar coincide con el de la píldora (±1 px, medido con `getBoundingClientRect`) y, cuando la píldora crece a varias líneas, los botones de la fila 1 quedan alineados al borde inferior; en expandido el layout de dos filas no cambia; `ReplyBox.spec.js` sigue en verde
  - commit: `feat(mobile): always show expand and center the bar controls`

- [ ] **4 · Grabadora de voz tipo WhatsApp en móvil**
  - archivos: `app/javascript/dashboard/components/widgets/WootWriter/AudioRecorder.vue`, `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`, `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`, `app/javascript/dashboard/components/widgets/conversation/specs/ReplyBox.spec.js`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: 3
  - listo cuando: bajo 640 px y mientras graba, la barra muestra el **tiempo** (`mm:ss`, `tabular-nums`) y la **onda en vivo** en una fila, y en la de abajo **papelera**, **pausa/reanudar** y **enviar redondo** (el resto del compositor —`+`, sparkle, píldora, candado— se oculta); la papelera llama a `toggleAudioRecorder` y descarta sin adjuntar nada; pausa/reanuda usa `pauseRecording`/`resumeRecording` del RecordPlugin y congela/reanuda el tiempo (`AudioRecorder` expone `pause`, `resume`, `isPaused`); **enviar** detiene la grabación, espera a la conversión y a la subida del adjunto y recién ahí dispara `onSend` (una sola vez, sin doble envío y sin enviar si la grabación falla: `recordError` limpia la bandera); los botones tienen `aria-label` por i18n (`REPLYBOX.AUDIO.DELETE`, `PAUSE`, `RESUME`, `SEND`); en >= 640 px la grabadora actual (micrófono, parar/reproducir) no cambia; el spec cubre: enviar durante la grabación llama a `stopRecording` y luego a `onSend` solo cuando el adjunto está listo
  - commit: `feat(mobile): voice recorder bar with delete, pause and send`

- [x] **5 · Reproductor de audio con barras arrastrables**
  - archivos: `app/javascript/dashboard/components-next/audio/WaveformSeekBar.vue`, `app/javascript/dashboard/components-next/audio/WaveformSeekBar.spec.js`, `app/javascript/dashboard/components-next/message/chips/Audio.vue`, `app/javascript/dashboard/components-next/audio/AudioPlayer.vue`
  - depende de: ninguna
  - listo cuando: existe `WaveformSeekBar.vue` (`<script setup>`, props `progress` 0–1, `duration`, `peaks` opcional; evento `seek`) que dibuja ~48 barras de igual altura (`rounded-full`, color tenue y color de progreso), admite **arrastre con Pointer Events** (`setPointerCapture`, `touch-none`) y toque directo, con zona táctil de ≥ 2.5 rem de alto, `role="slider"` y flechas de teclado; `chips/Audio.vue` y `AudioPlayer.vue` lo usan en lugar del `<input type=range>` manteniendo play/pausa, tiempo, velocidad, descarga y transcripción; el spec cubre: arrastrar hasta la mitad emite `seek` ≈ 0.5, y al soltar fuera de la barra el valor se limita a 0–1; ningún texto fijo
  - commit: `feat(audio): draggable waveform bar for voice messages`

- [ ] **6 · Evidencia en navegador y delta de specs**
  - archivos: `openspec/changes/mobile-composer-wa-parity/proposal.md`, `openspec/changes/mobile-composer-wa-parity/tasks.md`, `openspec/changes/mobile-composer-wa-parity/specs/mobile-composer/spec.md`, `openspec/changes/mobile-composer-wa-parity/verification.md`
  - depende de: 1, 2, 3, 4, 5
  - listo cuando: el change tiene `proposal.md` (Rama y Base), `tasks.md` (copia de estas tareas), el delta `specs/` con requisitos ADDED/MODIFIED y escenarios, y `verification.md` con las medidas hechas en viewport 390×844 táctil y teclado simulado de 420 px: (a) filas de respuestas rápidas de dos líneas y encabezado, (b) menú sin Cámara, (c) maximizar visible sin foco y centros alineados (±1 px), (d) grabadora: papelera/pausa/enviar y envío único, (e) arrastre en la barra de audio cambia `currentTime`, (f) a 1440×900 el DOM visible del compositor es el de hoy
  - commit: `docs(openspec): add the mobile composer parity change`

