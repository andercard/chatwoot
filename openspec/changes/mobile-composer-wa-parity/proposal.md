# Compositor móvil, paridad con WhatsApp: respuestas rápidas, menú +, grabadora de voz y reproductor de audio

> **Rama:** `picnic/feat/mobile-composer-bar`
> **Base:** `49e9faaea9`

## Qué encontré

Sin `.codegraph/` en el worktree (plan mode es solo lectura): lo afirmado sale de leer archivos con `rg`/`Read`. `node_modules` solo existe dentro de Docker, así que las APIs de `wavesurfer.js` se confirman en el apply.

- **Lista de respuestas rápidas (imagen 1):** hoy en móvil (`PreviewPicker.vue`, `compact`) cada fila es de **una línea**: título a la izquierda y subtítulo recortado a la derecha (`flex-1 items-center justify-between`, subtítulo `max-w-[50%]`). `CannedResponse.vue` arma `title = /shortcode` y `subtitle = snippet`. La app muestra **dos líneas**: atajo arriba (pequeño, gris, sin `/`) y contenido abajo (grande), con encabezado «Respuestas rápidas» y «Editar» a la derecha. «Editar» puede llevar a la ruta existente `accounts/:accountId/settings/canned-response` (`canned.routes.js:11`).
- **Menú + (imagen 3):** `ReplyBottomPanel.vue` (`mobileMenuItems`, ~l.200-280) lista Fotos (`mobilePhotosInput`, `photoFileTypes` imagen+video), Cámara (`mobileCameraInput`, `capture=environment`) y Adjuntar (`conversationAttachment`). Cámara es redundante: en iOS y Android un `<input type=file accept="image/*,video/*">` ya ofrece «Fototeca / Tomar foto o video / Elegir archivo», como dice el dev. Cámara se quita; «Adjuntar archivos» pasa a llamarse «Documento» (acepta todo lo del canal), que es lo que WhatsApp llama así.
- **Maximizar (imagen 3):** `showExpand()` en `ReplyBox.vue:271` es `isFocused || hasMeaningfulEditorContent`; por eso solo aparece con foco. Debe ser siempre visible en móvil.
- **Alineación vertical:** la cuadrícula de `.reply-box` usa `items-end` (`ReplyBox.vue` ~l.1436): los botones `size-8` (32 px) se pegan al fondo de la píldora de `min-h-11` (44 px) y se ven más abajo que el texto. Lo mismo pasa con candado y maximizar (`max-sm:self-end max-sm:m-1`, `ReplyTopPanel.vue` ~l.221-243). Con la píldora de una línea deben quedar centrados, y al crecer (varias líneas) quedarse abajo, como en la app.
- **Grabadora hoy:** `AudioRecorder.vue` usa `wavesurfer.js` `RecordPlugin` y hace `startRecording()` al montar; al parar convierte (`convertAudio`), emite `finishRecord` y `ReplyBox.onFinishRecorder` sube el archivo como adjunto (`isVoiceMessage`). El botón de la grabación en móvil es un solo botón con icono stop/play y la duración (`ReplyBottomPanel.vue` `showAudioPlayStopButton`, `audioRecorderPlayStopIcon`). No hay pausa/reanudar, ni «eliminar», ni «enviar» durante la grabación: hay que parar, esperar la subida y luego enviar. `wavesurfer.js` 7.8.6 y `opus-recorder` ya son dependencias; el RecordPlugin v7 expone `pauseRecording`, `resumeRecording`, `isPaused` (a confirmar en el contenedor).
- **Reproductor de audio hoy:** burbuja `components-next/message/bubbles/Audio.vue` → `chips/Audio.vue`: un `<input type=range>` plano de 4 px (`h-1`) con play, `mm:ss / mm:ss`, velocidad, silencio y descarga. Es difícil de arrastrar con el dedo. `components-next/audio/AudioPlayer.vue` (listados/llamadas) tiene otro `range` de 2 px. Los proveedores **no entregan picos de onda** en el adjunto (solo `data_url`, `fileType`, `extension`, `transcribedText`), así que la onda real exigiría descargar y decodificar cada audio en el navegador.
- **Librería:** `wavesurfer.js` (≈9 mil estrellas, bien mantenida) ya está en el repo y sabe pintar barras y arrastrar; pero necesita picos reales o decodificar el audio y crea un canvas por burbuja (listas largas). Para barras de igual altura y arrastre basta un componente propio con Pointer Events (~70 líneas, sin dependencia nueva). **Decisión propuesta:** componente propio; wavesurfer solo se sigue usando en la grabadora (onda en vivo).

## Qué propongo, y qué queda afuera

1. **Respuestas rápidas tipo app (móvil):** filas de dos líneas (atajo arriba, contenido abajo, ancho completo, separador fino) y encabezado «Respuestas rápidas» + «Editar» solo en `/`; menciones y macros usan el mismo formato de dos líneas sin encabezado de edición.
2. **Menú +:** Fotos (selector nativo, cubre cámara), Documento, y el resto como está. Sin «Cámara».
3. **Barra:** maximizar siempre visible; botones, candado y maximizar centrados con el texto de la píldora de una línea y anclados abajo al crecer.
4. **Grabadora móvil estilo WhatsApp:** al grabar, la barra pasa a: fila 1 con **tiempo** a la izquierda y **onda en vivo** a la derecha; fila 2 con **papelera** (cancela y descarta), **pausa/reanudar** (rojo, centro) y **enviar** (derecha; detiene, convierte, sube y envía solo). Escritorio no cambia.
5. **Reproductor tipo WhatsApp (móvil y escritorio):** componente nuevo de barras de **igual altura** con progreso y arrastre por puntero (atrás/adelante, objetivo táctil ≥ 40 px de alto), play/pausa grande, tiempo restante/transcurrido, velocidad 1×/1.5×/2×; se usa en la burbuja de audio y en `AudioPlayer.vue`. Si más adelante hay picos del servidor, el componente los acepta por prop (`peaks`) pero hoy no se piden.

**No entra:** onda real por decodificación (sin picos de servidor), grabar manteniendo pulsado el micrófono / bloquear, vista previa de la nota de voz tras pausar, cambios en el backend o en canales (todos reciben el mismo adjunto de audio), prueba en iPhone real (la hace el dev), publicar (PR/tag) sin confirmación.

## Con qué restricciones
- Tailwind solo, utilidades lógicas (`ms/me/start/end`), `rem` en dimensiones arbitrarias, sin CSS propio ni estilos en línea (salvo valores dinámicos del progreso, que van como variable CSS o `style` mínimo ya usado en el repo), `<script setup>` en componentes nuevos, textos por i18n (`en` + `es` como en la ronda anterior).
- Móvil con `max-sm:`/`sm:hidden`; **>= 640 px no cambia** (salvo el reproductor, que es compartido y sí cambia, a propósito). No tocar otros proveedores: nada de `channel_type` nuevo.
- Marcado accesible: la barra del reproductor es `role="slider"` con `aria-valuenow/min/max` y teclado (flechas); botones con `aria-label`.
- Commits convencionales sin mencionar IA; lint y specs acotados a lo tocado y dentro de Docker (`${=F}` en zsh); stagear por archivo.

## Preguntas abiertas
- Ninguna que bloquee. Supuestos: «mensaje directo» de tu nota = **respuestas rápidas**; el reproductor nuevo reemplaza al actual también en escritorio ("esto sí puede quedar también en desktop").

## Encontrado de paso
- `AudioRecorder.vue` hace `convertAudio` y emite `finishRecord` sin esperar a que `onFileUpload` termine; para «enviar durante la grabación» se encadena en `ReplyBox` (no se cambia el contrato del recorder).

## Cómo se verifica

Provisional: los valores salen de `origin/production` y de las rondas anteriores; el verify los reemplaza por los reales.

**Criterio del cambio entero:** en un teléfono, `/` muestra las respuestas rápidas como la app, el menú `+` no repite la cámara, el maximizar siempre se ve y todo queda alineado, grabar una nota de voz permite eliminar, pausar y enviar con el tiempo visible, y los audios de la conversación se arrastran con el dedo; a >= 640 px el compositor es el de hoy (el reproductor nuevo es el único cambio compartido).

**A. Automático**
- Lint: `F=$(git diff --name-only origin/production | grep -E '\.(js|vue)$' | tr '\n' ' '); docker compose exec -T vite pnpm exec eslint ${=F}` → 0 errores; único aviso admitido: el ya existente `MacroList.vue` `no-dynamic-keys`.
- Specs: `docker compose exec -T vite pnpm exec vitest run app/javascript/dashboard/components/widgets/conversation/specs/ReplyBox.spec.js app/javascript/dashboard/components/widgets/WootWriter app/javascript/dashboard/components-next/preview-picker app/javascript/dashboard/components-next/audio` → `Failed = 0`, `Test Files >= 5` (base: 4 archivos, 262 tests; se agregan los specs nuevos).
- Sin backend: `git diff --name-only origin/production -- app/models app/controllers app/services app/jobs db` → vacío.

**B. Navegador (invariantes, 390×844 táctil):**
- el `top` de la fila del título < el de la fila del contenido en cada ítem de `/`, y existe el encabezado «Respuestas rápidas»;
- no existe `input#mobileCameraInput` y el menú lista Fotos y Documento;
- con el editor vacío y sin foco existe el botón de maximizar visible; `|centroY(+) − centroY(píldora)| ≤ 1 px` con una línea;
- grabando: existen papelera, pausa y enviar, el tiempo avanza y se congela al pausar; enviar crea **un** mensaje con adjunto de audio;
- arrastrar sobre la barra de audio cambia `currentTime` en la dirección del arrastre;
- a 1440×900 el compositor tiene pestañas Responder/Nota privada y no hay botón `+`.

**C. Humano (iPhone real, app instalada):** teclado real con `/`, grabar con permiso de micrófono (pausar, eliminar, enviar), arrastrar la barra de un audio, abrir Fotos y Documento.

El change se archiva solo tras la prueba humana; publicar (`v4.18.0-picnic.7`) requiere confirmación aparte.
