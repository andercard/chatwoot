# 05 · Lucía en local (WhatsApp de prueba + n8n de staging)

Probar el chatbot completo contra tu Chatwoot local: cliente en WhatsApp → Chatwoot local → **el mismo n8n de staging** → respuesta en WhatsApp. Lo local nunca habla con servicios de producción y no se expone nada de staging a internet.

> Esta guía es genérica a propósito: **ningún valor privado** (servidor, dominios, IDs de Meta, números, tokens) vive en este repositorio. Están en `~/.config/picnicart/env` (plantilla: `picnicart/dev/env.example`) y en notas privadas fuera del repo.

```
Celular ──WhatsApp──▶ Meta ──override del número de prueba──▶ URL pública SOLO de /webhooks/whatsapp (Tailscale Funnel) ──▶ Chatwoot local
Chatwoot local ──webhook de cuenta──▶ n8n staging  (red privada Tailscale; n8n no se publica en internet)
n8n staging ──API──▶ Chatwoot local  (red privada Tailscale)
```

## Cómo decide n8n a quién responder

El n8n de staging mira el **número de conversación** que trae cada evento: si es **≥ 900000** responde al Chatwoot local; si no, al de siempre. Si el local está caído no llegan eventos con esos números y todo funciona como antes. Para que eso funcione, el Chatwoot local debe parecerse a staging:

| Requisito del Chatwoot local | Lo asegura `lucia.sh up` |
|---|---|
| Cuenta con el mismo ID que la de staging | sí |
| Usuario asesor y usuario bot con los mismos IDs que en staging | sí |
| Etiquetas con los mismos nombres que usa el bot | sí |
| Conversaciones que arrancan en 900000 (no chocan con las de staging en la memoria del bot ni en Redis) | sí (`ALTER SEQUENCE`) |
| Token del usuario bot = el que usa n8n | una vez: `lucia.sh bot-token` |
| Misma versión de Chatwoot que la desplegada | usar el entorno `production` (rama = release) |
| La app solo en `127.0.0.1` y la IP de Tailscale (nada en la LAN) | override de Docker (`dev/docker-compose.override.example.yml`) |

## ¿A cuál Chatwoot llega el mensaje de WhatsApp?

A **uno solo**, nunca a los dos. Meta guarda una URL de destino por número:
- Sin override (normal): llega al Chatwoot desplegado (cuenta de staging).
- Con `lucia.sh up` (override activo): llega solo a tu local; el desplegado deja de ver ese número hasta `lucia.sh down`.
- Los demás números de la misma app de Meta no se tocan.

## Uso diario (ya configurado)

```bash
cd ~/Desarrollo/chatwoot-worktrees/production
picnicart/dev/lucia.sh up --switch     # levanta todo (--switch apaga el otro entorno si está arriba)
# … pruebas: escribe al número de prueba desde tu celular …
picnicart/dev/lucia.sh status          # qué está prendido, URLs para el celular, si el override está activo
picnicart/dev/lucia.sh down            # devuelve el número a staging y cierra la ruta pública
```

`up` es idempotente y en orden:
1. Verifica **Tailscale** (la app se publica también en tu IP de Tailscale) y sincroniza `PICNIC_TS_IP` en `.env`.
2. Levanta Docker y espera a `localhost:3005/api`.
3. Crea/ajusta los datos locales de la tabla de arriba y el webhook de cuenta hacia n8n.
4. Comprueba, **desde el contenedor** de Chatwoot, que llega a n8n staging (lo despierta si estaba dormido).
5. Abre un **Funnel solo para la ruta `/webhooks/whatsapp`** (la app, la API y el login quedan privados).
6. Pone el **override de Meta** del número de prueba (token leído del Llavero de macOS).

**Siempre termina con `down`.** Si se te olvida, el staging queda sin el número de prueba.

Desde el celular (con Tailscale): `http://<IP de Tailscale de la Mac>:3005`. `status` imprime la URL.

## Configuración única

Los valores concretos están en `~/.config/picnicart/env` y en las notas privadas. Estado al 2026-10-10:

| # | Paso | Estado | Cómo |
|---|---|---|---|
| 1 | Entorno `production` (v4.17.1) inicializado | ⏳ | guía 01 "Primera vez" en el worktree |
| 2 | Archivo privado `~/.config/picnicart/env` | ✅ | copiar `dev/env.example` y completar |
| 3 | Servidor y Mac en la misma tailnet; `tailscale serve` del puerto de n8n en el servidor | ✅ | hecho por la sesión del servidor |
| 4 | Reglas de acceso (ACL) de Tailscale: el servidor solo llega a la Mac por el 3005; la Mac al servidor por el puerto de n8n y SSH | ⏳ | consola de Tailscale → Access controls |
| 5 | Activar Funnel en el tailnet | ⏳ | aprobar el enlace que imprime `lucia.sh up` |
| 6 | Token del bot en la BD local | ✅ | `lucia.sh bot-token --from-server` (lo trae por SSH a la base local sin imprimirlo ni usar el portapapeles; los datos del servidor están en `~/.config/picnicart/env`). Alternativa: copiarlo al portapapeles y correr `lucia.sh bot-token` |
| 7 | Token de WhatsApp en el Llavero | ⏳ | copiar el token y correr `lucia.sh wa-token`: lo valida con Meta **antes** de guardarlo, lo guarda en el Llavero y limpia el portapapeles. (No uses `security add-generic-password -w` interactivo: corta el token a 128 caracteres.) Sirve para la bandeja y para el override; necesita permisos de mensajería **y** de administración de WhatsApp |
| 8 | Bandeja WhatsApp Cloud en la cuenta local | ⏳ | `lucia.sh whatsapp-inbox` (la crea sin que Chatwoot toque los webhooks de Meta; ver nota) |

Cuando todo esté ✅ basta con `lucia.sh up` / `down`.

⚠️ El token del bot (paso 6) es el de un usuario del Chatwoot desplegado, limitado a la cuenta de staging. Queda guardado en la base de datos local de tu Mac: no hagas copias de esa base ni la compartas.

**Por qué la bandeja se crea con `lucia.sh whatsapp-inbox` y no desde la pantalla de Chatwoot:** al crear un canal WhatsApp Cloud manual, Chatwoot llama a Meta por su cuenta (`setup_webhooks`: apunta el webhook del número a `FRONTEND_URL` y puede registrar el número). Eso cambiaría lo que recibe staging sin que lo decidas. El comando desactiva ese efecto solo durante la creación; el único que apunta Meta a tu Mac es `lucia.sh up`.

## Si algo falla

| Síntoma en `up` / pruebas | Qué hacer |
|---|---|
| "missing …/env" | crear `~/.config/picnicart/env` desde `dev/env.example` |
| "Tailscale is not running" | abrir la app de Tailscale; el servidor debe aparecer en `tailscale status` |
| "environment '…' is using port 3005" | `lucia.sh up --switch` |
| "cannot reach n8n staging" | ¿`tailscale serve` activo en el servidor? ¿Tailscale arriba en ambos? abrir la URL pública de n8n staging (lo despierta) |
| "Funnel is not enabled" | paso 5 |
| "Meta rejected the override" | token vencido o sin permisos → regenerar y actualizarlo en el Llavero |
| Llega a local pero el bot no responde | `docker compose logs -f sidekiq`; ejecuciones del workflow en n8n; ¿el id de conversación es ≥ 900000? (`lucia.sh up` reajusta la secuencia) |
| El bot responde en staging en vez de local | override no activo → `lucia.sh status` |
| Staging dejó de recibir el número | quedó un override activo → `lucia.sh down` |
