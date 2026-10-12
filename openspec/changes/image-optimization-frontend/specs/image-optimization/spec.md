## ADDED Requirements

### Requirement: Optimización en el navegador según el límite del canal
El sistema SHALL optimizar en el navegador, antes de subirla, toda imagen JPEG o PNG que supere el límite de imagen del canal de la conversación, convirtiéndola a JPEG con la mayor calidad que quepa bajo ese límite, y SHALL dejar intactas las imágenes que ya cumplen y las de canales sin límite de imagen propio.

#### Scenario: Imagen grande en un canal con límite
- **GIVEN** una conversación de un canal con límite de imagen de 5 MB y una foto de 12 MB
- **WHEN** la asesora la adjunta
- **THEN** se sube un JPEG de menos de 5 MB y la alerta de límite no aparece

#### Scenario: Imagen que ya cumple
- **GIVEN** una conversación de un canal con límite de imagen y un JPEG de 1 MB
- **WHEN** la asesora lo adjunta
- **THEN** se sube el mismo archivo sin recodificar

#### Scenario: Canal sin límite de imagen propio
- **GIVEN** una conversación de un canal que usa el límite de la instalación
- **WHEN** la asesora adjunta una imagen
- **THEN** se sube el mismo archivo sin recodificar

#### Scenario: Un GIF no se convierte
- **GIVEN** una conversación de Facebook y un GIF animado de 9 MB
- **WHEN** la asesora lo adjunta
- **THEN** no se convierte y se muestra la alerta de límite actual

### Requirement: Calidad estándar de WhatsApp
El sistema SHALL reducir a un lado largo de 1600 px toda imagen adjuntada sin HD en una conversación de WhatsApp que lo supere, y SHALL conservar la orientación y aplanar la transparencia sobre blanco.

#### Scenario: Foto grande en WhatsApp sin HD
- **GIVEN** una conversación de WhatsApp y un JPEG de 3 MB con 4000×3000 px
- **WHEN** la asesora lo adjunta con el icono HD apagado
- **THEN** se sube un JPEG con el lado largo de 1600 px

#### Scenario: Foto con rotación EXIF
- **GIVEN** una conversación de WhatsApp y una foto con orientación EXIF
- **WHEN** la asesora la adjunta
- **THEN** la imagen subida se ve derecha

### Requirement: HD solo donde el canal lo soporta
El sistema SHALL ofrecer el icono HD por imagen únicamente en los canales que tengan un nivel de calidad HD (WhatsApp), apagado por defecto, y SHALL reoptimizar desde el original con un lado largo de hasta 4096 px al activarlo.

#### Scenario: El icono HD aparece en WhatsApp
- **GIVEN** una conversación de WhatsApp con una imagen adjunta
- **WHEN** la asesora ve la vista previa
- **THEN** la imagen muestra el icono HD apagado

#### Scenario: El icono HD no aparece en otros canales
- **GIVEN** una conversación de Facebook, Instagram, Line, TikTok o Twilio con una imagen adjunta
- **WHEN** la asesora ve la vista previa
- **THEN** la imagen no muestra el icono HD

#### Scenario: Activar HD reoptimiza
- **GIVEN** una foto adjunta de más de 5 MB y 4000×3000 px en WhatsApp
- **WHEN** la asesora activa el icono HD
- **THEN** la imagen se vuelve a optimizar desde el original con un lado largo mayor que 1600 px y menos de 5 MB, y se sube de nuevo

### Requirement: La burbuja marca las imágenes enviadas en HD
El sistema SHALL mostrar la marca HD en la imagen del mensaje saliente cuando se envió con HD y una imagen final de más de 1600 px, y no mostrarla en caso contrario.

#### Scenario: Imagen enviada con HD
- **GIVEN** una imagen enviada con el icono HD activo
- **WHEN** la asesora ve el mensaje
- **THEN** la imagen muestra la marca HD

#### Scenario: HD sobre una imagen pequeña
- **GIVEN** una imagen de 1200 px enviada con el icono HD activo
- **WHEN** la asesora ve el mensaje
- **THEN** la imagen no muestra la marca HD

### Requirement: Avisos cuando no se puede optimizar
El sistema SHALL avisar a la asesora cuando no pueda optimizar una imagen y SHALL adjuntar el original solo si cabe en el límite del canal.

#### Scenario: Navegador sin soporte
- **GIVEN** un navegador sin canvas
- **WHEN** la asesora adjunta una imagen de más del límite del canal
- **THEN** se muestra el aviso de que el navegador no puede optimizar y no se adjunta

#### Scenario: Imagen que no se puede decodificar
- **GIVEN** una imagen que el navegador no puede decodificar y que cabe en el límite
- **WHEN** la asesora la adjunta
- **THEN** se muestra el aviso de que no se pudo optimizar y se adjunta el original

#### Scenario: Sigue demasiado grande
- **GIVEN** una imagen que tras la escalera sigue sobre el límite
- **WHEN** la asesora la adjunta
- **THEN** se muestra el aviso de que no se pudo reducir lo suficiente y no se adjunta

### Requirement: No enviar mientras se optimiza
El sistema SHALL mostrar un indicador de optimización y deshabilitar el envío mientras una imagen se optimiza.

#### Scenario: Envío durante la optimización
- **GIVEN** una imagen grande que se está optimizando
- **WHEN** la asesora intenta enviar
- **THEN** el botón Enviar está deshabilitado y se ve el indicador de optimización
