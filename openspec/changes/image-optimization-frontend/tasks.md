# Tareas

- [ ] **1 · Helper de optimización en el navegador**
  - archivos: `app/javascript/shared/helpers/imageOptimizer.js`, `app/javascript/shared/helpers/specs/imageOptimizer.spec.js`
  - depende de: ninguna
  - listo cuando: `isImageOptimizationSupported()` detecta canvas/`toBlob`; `optimizeImage(file, { maxBytes, ladder })` devuelve `{ file, width, height }` con un JPEG `.jpg` ≤ `maxBytes`, bajando de peldaño, respetando EXIF, aplanando alpha y sin ampliar; lanza errores tipados `UNSUPPORTED`, `DECODE_FAILED` y `TOO_LARGE` (también si el resultado es < 2 KB); `getLongestSide(file)` devuelve el lado largo orientado; los specs (canvas e `<img>` simulados) cubren cada caso
  - commit: `feat(dashboard): add a browser image optimizer`

- [ ] **2 · Política de optimización por canal**
  - archivos: `app/javascript/dashboard/helper/imageOptimizationPolicy.js`, `app/javascript/dashboard/helper/specs/imageOptimizationPolicy.spec.js`
  - depende de: ninguna
  - listo cuando: `getImageOptimizationPolicy({ inbox, installationLimit })` devuelve `null` para canales sin límite de imagen menor al de la instalación y para formatos GIF; para `Channel::Whatsapp` devuelve `supportsHd: true`, `standardMaxSide: 1600`, `hdMaxSide: 4096`, `maxBytes` 4.5 MB; para Twilio, Facebook, Instagram, Line y TikTok devuelve `supportsHd: false`, sin recorte estándar y `maxBytes` por debajo del límite de `getMaxUploadSizeByChannel`; el spec recorre la tabla de canales
  - commit: `feat(dashboard): add the image optimization policy per channel`

- [ ] **3 · Portar el frontend de HD de la rama archivada**
  - archivos: `app/javascript/dashboard/components/widgets/AttachmentsPreview.vue`, `app/javascript/dashboard/components-next/message/bubbles/Image.vue`, `app/javascript/dashboard/i18n/locale/en/settings.json`, `app/javascript/dashboard/i18n/locale/es/settings.json`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: ninguna
  - listo cuando: los commits `370e47b607`, `c28a2bf8c8` y `19bd026b48` de `picnic/feat/whatsapp-image-compression` aplican sobre 4.18.0 (cherry-pick); el icono HD aparece solo con la prop `showHdToggle` y el botón admite estado de carga; la burbuja muestra la marca con `imageQuality === 'hd'`; ESLint limpio
  - commit: los mensajes de los cherry-picks

- [ ] **4 · Integración en el compositor y avisos**
  - archivos: `app/javascript/dashboard/mixins/fileUploadMixin.js`, `app/javascript/dashboard/mixins/specs/fileUploadMixin.spec.js`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: 1, 2, 3
  - listo cuando: `onFileUpload` de una imagen con política aplicable la optimiza (perfil estándar) **antes** de `maxSizeFor`/`DirectUpload`; una imagen que ya cumple sube idéntica; cada fila de la tabla de bordes se comporta como se describe (avisos traducidos para sin soporte, no se pudo optimizar y sigue muy grande); `maxSizeFor` no cambia; el mixin expone una función de subida reutilizable que devuelve el `blob`; spec y ESLint en verde
  - commit: `feat(dashboard): optimize oversized images before uploading`

- [ ] **5 · ReplyBox: estado, HD y envío**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`
  - depende de: 4
  - listo cuando: el adjunto conserva `originalFile`; `showHdToggle` = `policy.supportsHd` (ya no `isAWhatsAppCloudChannel`); `toggleHd` reoptimiza con el perfil HD o estándar, vuelve a subir y reemplaza `resource`, `thumb` y `blobSignedId`; mientras optimiza se ve "Optimizando imagen…" y Enviar queda deshabilitado; `contentAttributes: { image_quality: 'hd' }` solo si la imagen final supera 1600 px (cherry-pick `b74196a0a4` ajustado); ESLint limpio
  - commit: `feat(dashboard): re-optimize the image when toggling hd`
