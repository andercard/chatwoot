# Optimizar imágenes en el navegador, por proveedor, con HD solo donde exista

> **Rama:** `picnic/feat/image-optimization-frontend`
> **Base:** `2d4510a4a5`

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más. La base es la actualización a v4.18.0 (`picnic/chore/upgrade-v4.18.0`); este cambio reemplaza la versión de backend de la rama archivada `picnic/feat/whatsapp-image-compression`.

## Qué encontré

- **Por qué en el navegador.** Upstream cerró el PR #12293 (conversión en backend) diciendo que prefieren convertir en el frontend por costo de cómputo, y v4.18.0 ya sube los adjuntos de WhatsApp Cloud a Meta por `media_id` (`app/services/whatsapp/media_upload_service.rb`, PR #15702). Un JPEG ya optimizado en el navegador es un adjunto normal: esa subida lo envía sin tocar backend (usa `blob.content_type` y el nombre del archivo).
- **Límites por canal** (`@chatwoot/utils` `getMaxUploadSizeByChannel`, lo que usa la interfaz): WhatsApp 5 MB (jpeg, png), Twilio WhatsApp y SMS 5, Facebook 8, Instagram 16 (Meta documenta 8), Line 10, TikTok 3, el resto el límite de la instalación (40).
- **HD solo existe en WhatsApp.** Estándar 1600 px y HD 4096 px, elegible por foto; confirmado en teléfono con Cloud API (estándar a 1600 px sin marca HD, HD con marca). Twilio WhatsApp y 360dialog no se pudieron verificar.
- **Capacidades del navegador.** Chromium, foto de 48 MP / 19 MB: JPEG 1600 px q85 en 1.4 s (0.29 MB), 4096 px q92 en 1.5 s (1.57 MB), EXIF respetado, alpha aplanado. Safari/iOS: lienzo máximo de 16 777 216 px, posible lienzo en blanco silencioso, `OffscreenCanvas.convertToBlob` desde 16.4, `createImageBitmap` parcial antes de 17. Ruta principal: `<img>` + `<canvas>` + `toBlob`. No probado en iPhone.
- **Flujo de subida actual.** `app/javascript/dashboard/mixins/fileUploadMixin.js` (`onFileUpload`, usado por `ReplyBox`; pegado y arrastrar llegan al mismo) revisa el tamaño con `maxSizeFor` y sube por `DirectUpload`; `ReplyBox.vue:1131` arma el adjunto. Con subida directa el archivo ya está en el servidor al adjuntar: cambiar HD exige reoptimizar desde el original y volver a subir.
- Sin `.codegraph/` en el worktree; lo afirmado se leyó de los archivos.

## Qué propongo, y qué queda afuera

Una **tabla de política por canal** (`dashboard/helper/imageOptimizationPolicy.js`) y un **helper puro** (`shared/helpers/imageOptimizer.js`). La política devuelve `null` (no tocar) o `{ maxBytes, standardMaxSide, hdMaxSide, supportsHd }`: el límite sale de `getMaxUploadSizeByChannel`; WhatsApp (`Channel::Whatsapp`) usa 4.5 MB, estándar ≤ 1600 px, HD hasta 4096 px y ofrece HD; el resto de canales con límite solo "ajustan para que quepa" y no ofrecen HD; GIF nunca se toca. El helper decodifica con `<img>`, aplana sobre blanco, reduce y codifica a JPEG por una escalera hasta caber, sin ampliar. Sin cambios de backend; `maxSizeFor` no cambia.

Bordes y avisos: sin soporte del navegador o imagen que no decodifica → aviso, y se adjunta el original solo si cabe en el límite; si tras la escalera sigue sobre el límite o el resultado es un lienzo en blanco (< 2 KB) → aviso y no se adjunta; mientras optimiza, indicador y Enviar deshabilitado; HD sobre una imagen ya pequeña no manda la marca.

**No entra:** aceptar WebP/HEIC/AVIF en el selector de WhatsApp; la nueva conversación (`useFileUpload.js`); mensajes por API, bot o app móvil; corregir el límite de Instagram; la rama de backend (queda archivada).

## Con qué restricciones

- `<script setup>` en componentes nuevos (cambios mínimos en los legacy `ReplyBox`/mixin); solo Tailwind; textos por i18n (`en` primero, el fork también `es`); ESLint limpio; specs Vitest; commits convencionales sin mencionar IA; `HUSKY=0` con lint en Docker (autorizado, el host no tiene Node).
- Para upstream: el PR sale de una rama desde `upstream/develop` solo con los commits de frontend, sin `openspec/` ni `picnicart/`; antes hay que proponerlo en el issue #6210 y esperar aprobación. Nada se publica sin confirmación del usuario.

## Preguntas abiertas

1. El PR de actualización a v4.18.0 aún no existe; va primero (merge commit) y esta rama sale encima.
2. Escalera y topes 4.5 MB / 1600 / 4096 px son los validados con Cloud API; provisionales para el resto de canales.
3. Twilio WhatsApp sin HD hasta verificarlo; 360dialog comparte la regla de WhatsApp sin haberlo probado.

## Encontrado de paso

- La tabla de Chatwoot dice Instagram 16 MB; Meta documenta 8 MB. Conviene reportarlo upstream.
- `AttachmentsPreview.vue:56`: `:key="attachment.id"` es `undefined` en adjuntos nuevos (preexistente).
- `useFileUpload.js` y `fileUploadMixin.js` duplican casi toda la lógica de subida.
- Telegram no tiene límite propio en la tabla (40 MB) aunque sus fotos tienen un tope menor.

## Cómo se verifica

**Este cambio altera lo que ve y recibe el cliente**: lleva delta `specs/image-optimization/spec.md`.

**A. Automático**
- `docker compose exec -T vite pnpm exec eslint <archivos de las tareas>` → 0 errores (se aceptan warnings preexistentes).
- `docker compose exec -T vite pnpm exec vitest run app/javascript/shared/helpers/specs/imageOptimizer.spec.js app/javascript/dashboard/helper/specs/imageOptimizationPolicy.spec.js app/javascript/dashboard/mixins/specs/fileUploadMixin.spec.js` → 0 fallos.
- `git diff --name-only 2d4510a4a5..HEAD -- app/services app/models app/controllers app/jobs` → vacío (sin cambios de backend).

**B. En el navegador real** (invariantes): con una foto sintética de 48 MP cargando el helper desde Vite: JPEG, ≤ `maxBytes`, lado largo ≤ 1600 px en estándar y mayor en HD, HD ≥ estándar en dimensiones y bytes, orientación EXIF respetada; con `HTMLCanvasElement.prototype.toBlob` anulado: muestra el aviso y respeta adjuntar/bloquear.

**C. Humano con WhatsApp real** (v4.18.0 sube por `media_id`, sin override): foto grande sin HD llega sin marca HD; con HD llega con marca; carta con texto pequeño legible; JPEG pequeño idéntico; en un inbox no WhatsApp el icono HD no aparece.

**D. iPhone/Safari (humano):** foto de 12 MP y otra de 48 MP desde el navegador del teléfono; si Safari falla, aviso y, si el original cabe, adjuntarse igual.
