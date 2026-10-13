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

---

# Ronda 2 (viewport 390×844 touch, teclado simulado de 420 px)

## Caja expandida
- Con `data-expanded="true"`: `.reply-box__top` mide de 8 a 382 px (374 px; `.reply-box` va de 0 a 390), de 408 a 788 px de alto, y su borde inferior (788) queda **por encima** del borde superior del botón `+` (804). La caja ocupa todo el ancho útil, sin las columnas laterales.
- Fila de íconos debajo: `+` (804–836), sparkle (804–836) y enviar (796–836): comparten el borde inferior (836); enviar es 8 px más alto (40 px frente a 32 px).
- Dentro de la caja: candado abajo a la derecha (346–378 / 752–784) y botón de contraer arriba a la derecha (346–378 / 412–444).
- Animación: la caja lleva `animate-fade-in-up` (0.3 s, funciona también en Safari/iOS) y la transición de alto del editor es `0.2s` (`transition-duration` medido), que solo anima en Chromium ≥ 129 (`interpolate-size`); en iOS el alto cambia de golpe y solo se anima la entrada.

## Selectores de archivo del menú +
Con `HTMLInputElement.prototype.click` espiado, tocar cada fila llamó una vez al `click()` de su entrada: Fotos → `mobilePhotosInput`, Cámara → `mobileCameraInput`, Adjuntar archivos → `conversationAttachment`. (El selector nativo no se ve en el navegador de escritorio: queda para el iPhone.)

## Menú +
En respuesta: Fotos, Cámara, Adjuntar archivos, Grabar audio, Macros, Activar firma, Plantillas de Whatsapp. La fila 2 de la cuadrícula ya no existe (0 botones por debajo de la fila de íconos). El botón de videollamada no aparece (`max-sm:hidden`).

## Píldora que crece
Vacía mide 44 px; con 8 líneas escritas mide 112 px (7 rem) y hace scroll interno (`scrollHeight > clientHeight`); al borrar vuelve a 44 px.

## `@` filtra y `#` abre macros
- `@` en nota privada: 5 filas; al escribir `jo` queda 1 (John); el foco sigue en el editor.
- Fila «Macros»: inserta `#` y abre la lista (sin campo de búsqueda); en esta cuenta local no hay macros creadas, así que la lista sale vacía (0 filas).

## No medido en navegador
- Candado deshabilitado con respuestas restringidas: no se pudo reproducir localmente; el código lo hace (`:disabled="disabled || isReplyRestricted"`) y `ReplyBox.spec.js` cubre que se fuerza la nota.
- Fila «Pedir datos de contacto»: esta conversación ya tiene teléfono, así que el componente no se muestra; el código reutiliza la misma condición (`showButton`).
- Sin macros habilitadas la fila «Macros» no aparece: se comprueba por código (`enableMacros`), no con una cuenta sin la función.
- iPhone real: pendiente.

---

# Ajustes tras la prueba en el celular (tareas 11 y 12)

Medido en navegador, 390×844 con teclado simulado de 420 px, y 1440×900 para escritorio:
- **Títulos de grupo** («Agentes», «Equipos») en la lista de `@`: 32 px de alto con 8 px de relleno arriba y abajo (5 filas de agentes y equipos).
- **Candado:** 32×32 px con `border-radius: 9999px` (círculo) en reposo y en nota privada (fondo ámbar).
- **Espacio sobre la píldora** en la barra compacta: de 13 px a 11 px entre el borde superior del compositor y la píldora.
- **Escritorio, botón de adjuntar:** los botones de la fila inferior (emoji, adjuntar, micrófono, firma, plantillas, enviar) comparten `top` 847 / `bottom` 879 (sin desfase).
- **Mensajes rápidos en notas privadas:** en nota privada `/` abre la lista de 29 respuestas (sin campo de búsqueda en móvil, con foco en el editor; con campo de búsqueda en escritorio) y `@` sigue abriendo agentes y equipos.
- Nota de prueba: los borradores de nota y de respuesta se guardan por separado; para medir limpio hubo que enviar la nota de prueba (nota privada) y dejar el editor vacío.
