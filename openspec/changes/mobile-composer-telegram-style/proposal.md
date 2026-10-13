# Compositor móvil estilo Telegram: cápsula única, mic/enviar, grabadora con vista previa y audios que suenan en iPhone

> **Rama:** `picnic/feat/mobile-composer-bar`
> **Base:** `ca794f750e`

## Qué encontré

Sin `.codegraph/` en el worktree (plan mode es solo lectura): lo afirmado sale de leer archivos. No pude abrir Telegram Web en el navegador: exige iniciar sesión con la cuenta del usuario y eso no lo hago; el diseño sale de las 5 capturas.

**Lo que muestran las capturas de Telegram (y qué tomamos):**
1. *Una línea, vacía:* una sola cápsula redondeada con todo adentro: botón redondo a la izquierda, clip, «Message», emoji y un botón redondo a la derecha (**mic**). → Nuestra cápsula: `[+] [texto] [candado] [mic]`. No llevamos el botón «≡» de atajos (lo pidió el dev), ni el emoji: **en su lugar va el candado** de nota privada.
2. *Texto de varias líneas:* la cápsula crece; el texto queda en el centro entre dos columnas de iconos; **IA (✨) arriba a la izquierda y expandir arriba a la derecha**, y abajo los iconos de la fila y el botón redondo de enviar. → Igual, con nuestros iconos (✨ IA, expandir, `+`, candado, enviar). IA y expandir **solo aparecen cuando hay varias líneas** (decisión del dev).
3. *Expandido:* caja grande; arriba deshacer/rehacer y contraer; texto a ancho completo; abajo fila de herramientas y enviar. → Ya tenemos la caja expandida de dos filas (`data-expanded`); se adapta: arriba ✨ IA y contraer, abajo `+`, candado y enviar.
4. *Grabando:* en la misma cápsula `[papelera] [punto rojo + onda en vivo + 0:12,29] [pausa] [enviar]`.
5. *Pausado:* `[papelera] [play + onda con perilla + 0:06,89] [mic] [enviar]`: se puede **escuchar lo grabado antes de enviar**, arrastrar y reproducir.

**Estado actual del código (mi implementación anterior, que no gustó):**
- `ReplyBox.vue` (~l.1436): cuadrícula `max-sm:grid-cols-[auto_auto_minmax(0,1fr)_auto]` con `+`, ✨ y enviar como celdas sueltas y la píldora (`.reply-box__top`) en la columna 3, con candado y maximizar **superpuestos** (`ReplyTopPanel.vue` l.217-243). Medido: la píldora mide 52 px y los botones quedan fuera de ella, no dentro de una cápsula.
- `ReplyBottomPanel.vue`: enviar redondo `sm:hidden` (~l.655), fila 2 de grabación con papelera/pausa/enviar `sm:hidden` (tarea 4 anterior) y el menú `+` con «Grabar audio» (`mobileMenuItems`).
- `ResizableEditorWrapper.vue`: ya marca `data-expanded` y usa `!h-auto !min-h-11 !max-h-28` en compacto (la altura crece con el texto), pero no avisa cuándo hay varias líneas.
- `AudioRecorder.vue`: onda de `wavesurfer.js` de 100 px en escritorio y 40 px en móvil, grabación al montar, `RecordPlugin` con `pauseRecording/resumeRecording/isPaused`; al detener convierte (`convertAudio`) y emite `finishRecord`. No hay vista previa tras pausar.
- **Por qué el audio grabado en escritorio no suena en el iPhone (causa):** para WhatsApp la grabadora produce **OGG/Opus** (`ReplyBox.audioRecordFormat` → `AUDIO_FORMATS.OGG`; `convertAudio` re-empaqueta WebM→OGG con `remuxWebmToOgg`, `audioConversionUtils.js`). Safari de iPhone no reproduce OGG/Opus en `<audio>` (y `decodeAudioData` tampoco), así que `chips/Audio.vue` no puede reproducirlo. En Safari la grabadora ya cae a MP3, por eso los audios grabados en el iPhone sí suenan en todas partes.
- Reproductor actual (`chips/Audio.vue`, `AudioPlayer.vue`, `WaveformSeekBar.vue`): barras uniformes con play, tiempo, velocidad, silencio, descarga; el dev no quedó conforme con el aspecto en escritorio.
- Librería para el audio: `ogg-opus-decoder` (eshaz/wasm-audio-decoders, MIT, WebAssembly, ≈100 KB gz, mantenida) decodifica OGG/Opus a PCM en el navegador; `wavesurfer.js` ya está en el repo para la onda en vivo.

## Qué propongo, y qué queda afuera

1. **Cápsula única (<640 px):** `.reply-box` pasa a ser **la cápsula** (fondo y radio propios, ámbar en nota privada) y los controles viven dentro: col 1 `+`, col 2 el editor, col 3 candado, col 4 **mic/enviar** (mic con el editor vacío y sin adjuntos —empieza a grabar—; flecha de enviar si hay texto o adjuntos). Sin botón de emoji ni de atajos. «Grabar audio» sale del menú `+` en móvil (lo cubre el mic).
2. **Varias líneas:** nuevo `data-grown` (el contenido ocupa más de una línea) → ✨ IA arriba-izquierda y expandir arriba-derecha, `+`/candado/enviar abajo, texto en el centro.
3. **Expandido:** misma caja de dos filas de hoy, con ✨ y contraer arriba dentro de la caja y `+`, candado y enviar abajo.
4. **Grabadora tipo Telegram (móvil y escritorio):** una barra compacta dentro de la cápsula: grabando `[papelera] [● onda en vivo + tiempo] [pausa] [enviar]`; tras pausar `[papelera] [▶ onda con perilla + tiempo] [mic] [enviar]`: se escucha y arrastra lo grabado. Pausar **detiene** la grabación y deja el audio listo para escuchar; el mic de la barra pausada **empieza una grabación nueva** que reemplaza a la anterior (con confirmación visual: la barra vuelve a «grabando»). **No** se agrega al audio previo (unir grabaciones exige re-empaquetar Opus).
5. **Reproductor estilo Telegram:** play redondo, barra de barras con perilla arrastrable, duración, chip de velocidad; en la conversación y en `AudioPlayer.vue`.
6. **Audios OGG/Opus en iPhone:** si `<audio>.canPlayType('audio/ogg; codecs=opus')` es vacío (Safari), se carga **bajo demanda** `ogg-opus-decoder`, se decodifica el archivo y se entrega a `<audio>` como WAV mono (16 kHz/16 bits, ≈1.9 MB por minuto); en los demás navegadores no se descarga nada.

**No entra:** unir grabaciones tras pausar, bloqueo de grabación por gesto, onda real de los audios recibidos (los proveedores no dan picos), emoji en el compositor móvil, botón de atajos «≡», cambios en backend o canales, publicar o probar en el iPhone por mí.

## Con qué restricciones
- Tailwind solo, utilidades lógicas (`ms/me/start/end`), `rem` en medidas arbitrarias, sin CSS propio, `<script setup>`, textos por i18n (`en` y `es`). Colores: tokens de Chatwoot (`bg-n-*`, `n-blue` para enviar, ámbar en nota privada), no el morado de Telegram.
- Móvil con `max-sm:`/`sm:hidden`; **>= 640 px no cambia el compositor** (escritorio) salvo la grabadora y el reproductor, que son compartidos a propósito.
- Dependencia nueva: `ogg-opus-decoder` (pin exacto, import dinámico). Se agrega con `pnpm add` dentro de Docker y el cambio queda en `package.json` y `pnpm-lock.yaml`.
- Medir en navegador: el stack de `localhost:3005` sirve este worktree. Los subagentes no usan `docker compose exec` (apunta a otro worktree): usan `docker compose run --rm --no-deps -T vite …`.
- Commits convencionales sin mencionar IA; stagear por archivo.

## Preguntas abiertas
- Ninguna que bloquee. Decisiones del dev ya tomadas: barra vacía como Telegram, mic cuando está vacío, decodificar OGG en el navegador, rediseñar grabadora y reproductor.

## Encontrado de paso
- `AudioPlayer.vue` (listados y llamadas) usa las mismas barras; las grabaciones de llamadas son MP3/WAV y no necesitan el decodificador.

## Cómo se verifica

Provisional: los valores salen de la rama actual; el verify los reemplaza por los reales.

**Criterio del cambio entero:** en un teléfono el compositor es una cápsula única (`+`, texto, candado, mic/enviar) que crece como Telegram, la grabadora permite pausar, escuchar, arrastrar, borrar y enviar, y un audio grabado en escritorio (OGG/Opus) se reproduce en Safari; a >= 640 px el compositor es el de hoy.

**A. Automático**
- Lint: `F=$(git diff --name-only origin/production | grep -E '\.(js|vue)$' | tr '\n' ' '); docker compose run --rm --no-deps -T vite pnpm exec eslint ${=F}` → 0 errores; único aviso admitido: `no-raw-text` del `' / '` en `chips/Audio.vue` si sigue.
- Specs: `docker compose run --rm --no-deps -T vite pnpm exec vitest run app/javascript/dashboard/components/widgets/conversation/specs/ReplyBox.spec.js app/javascript/dashboard/components/widgets/WootWriter app/javascript/dashboard/components-next/audio app/javascript/dashboard/components-next/preview-picker app/javascript/dashboard/helper/specs/oggOpusFallback.spec.js` → `Failed = 0`.
- Sin backend: `git diff --name-only origin/production -- app/models app/controllers app/services app/jobs db` → vacío.
- Dependencias: `git diff origin/production -- package.json` → solo agrega `ogg-opus-decoder` con versión exacta.

**B. Navegador (390×844 táctil, localhost:3005):**
- `+`, editor, candado y botón derecho son hijos visuales de un mismo contenedor con radio ≥ 1.5 rem y `|centroY − centroY_cápsula| ≤ 1 px`;
- vacío: el botón derecho es mic; tras escribir una letra, es enviar;
- con texto de ≥ 2 líneas existen ✨ y expandir arriba; con una línea no son visibles;
- grabando: existe la barra de una fila con papelera, tiempo, pausa y enviar; tras pausar existe play y la perilla; enviar crea un único mensaje con audio;
- a 1440×900 el DOM visible del compositor tiene las pestañas Responder/Nota privada y no hay botón `+`.

**C. Humano (iPhone real, app instalada):** teclado y `/`, grabar con permiso de micrófono (pausar, escuchar, borrar, enviar), y reproducir **un audio grabado en escritorio** dentro de Chatwoot en el iPhone.

El change se archiva solo tras la prueba humana; publicar (`v4.18.0-picnic.7`) requiere confirmación aparte.
