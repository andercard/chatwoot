# 05 · Lucía en local (WhatsApp de prueba + n8n de staging)

Probar el chatbot completo contra tu Chatwoot local: cliente en WhatsApp → Chatwoot local → n8n **staging** → respuesta en WhatsApp. Lo local nunca habla con servicios de producción.

> Esta guía es genérica a propósito: **ningún valor privado** (servidor, dominios, IDs de Meta, números) vive en este repositorio. Están en `~/.config/picnicart/env` (plantilla: `picnicart/dev/env.example`) y en notas privadas fuera del repo.

```
Celular ──WhatsApp──▶ Meta ──override del número de prueba──▶ URL pública de tu Mac (Tailscale Funnel) ──▶ Chatwoot local :3005
Chatwoot local ──webhook de cuenta──▶ host.docker.internal:<puerto> ──túnel SSH──▶ n8n de staging (127.0.0.1:<puerto> en el servidor)
n8n de staging (copia [LOCAL] del bot) ──API──▶ URL pública de tu Mac ──▶ Chatwoot local
```

## ¿A cuál Chatwoot llega el mensaje?

A **uno solo**, nunca a los dos. Meta guarda una URL de destino por número:
- Sin override (normal): llega al Chatwoot desplegado (cuenta de staging).
- Con `lucia.sh up` (override activo): llega solo a tu local; el desplegado deja de ver ese número hasta que hagas `lucia.sh down`.
- Los demás números de la misma app de Meta no se tocan: el override es solo del número de prueba.

## Uso diario (ya configurado)

```bash
cd ~/Desarrollo/chatwoot-worktrees/production
picnicart/dev/lucia.sh up --switch     # levanta todo (--switch apaga el otro entorno si está arriba)
# … pruebas: escribe al número de prueba desde tu celular …
picnicart/dev/lucia.sh status          # qué está prendido, URLs para el celular, si el override está activo
picnicart/dev/lucia.sh down            # devuelve el número a staging y cierra túneles
```

`up` es idempotente y en orden:
1. Levanta Docker y espera a `localhost:3005/api`.
2. Asegura la cuenta local, la contraseña local de `john@acme.inc` (en `.env` → `LOCAL_ADMIN_PASSWORD`) y el webhook de cuenta hacia n8n.
3. Prende **Tailscale Funnel** (URL pública de tu Mac).
4. Abre el **túnel SSH** a n8n de staging (y lo despierta si estaba apagado por inactividad).
5. Pone el **override de Meta** del número de prueba hacia tu Mac (token leído del Llavero de macOS).

**Siempre termina con `down`.** Si se te olvida, el staging queda sin el número de prueba.

## Configuración única

Los valores concretos están en `~/.config/picnicart/env`. Estado al 2026-10-10:

| # | Paso | Estado | Cómo |
|---|---|---|---|
| 1 | Entorno Docker, puerto 3005 | ✅ | guía 01 |
| 2 | Archivo privado `~/.config/picnicart/env` | ✅ | copiar `dev/env.example` y completar |
| 3 | Tu llave SSH entra al servidor | ✅ | `ssh <PICNIC_SERVER_SSH> true` |
| 4 | Tailscale en Mac y celular | ✅ | app Tailscale |
| 5 | **Activar Funnel en el tailnet** | ⏳ | aprobar el enlace que imprime `tailscale funnel --bg 3005` |
| 6 | Entorno de `production` (worktree) inicializado | ⏳ | guía 01 "Primera vez" |
| 7 | `FRONTEND_URL` del entorno de pruebas = URL pública de la Mac | ⏳ | editar `.env` → `docker compose up -d` |
| 8 | Bandeja WhatsApp Cloud en la cuenta local | ⏳ | Ajustes → Bandejas → WhatsApp → WhatsApp Cloud (número, Phone Number ID, WABA y clave de API: los pegas tú) |
| 9 | Token de WhatsApp en el Llavero | ⏳ | `security add-generic-password -s <PICNIC_KEYCHAIN_SERVICE> -a "$USER" -w` |
| 10 | Copia `[LOCAL]` del bot en n8n de staging | ⏳ | la crea la sesión del servidor (ver notas privadas) |
| 11 | Token de API del Chatwoot local en la credencial de esa copia | ⏳ | Chatwoot local → Perfil → Token de acceso |

Cuando todo esté ✅ basta con `lucia.sh up` / `down`.

## Si algo falla

| Síntoma en `up` / pruebas | Qué hacer |
|---|---|
| "missing …/env" | crear `~/.config/picnicart/env` desde `dev/env.example` |
| "Funnel is not enabled on the tailnet" | paso 5 |
| "environment '…' is using port 3005" | `lucia.sh up --switch` |
| "ssh tunnel failed" | probar el SSH a mano; revisar red/VPN |
| "n8n (staging) not answering" | abrir la URL pública de n8n staging (lo despierta) y repetir `up` |
| "Meta rejected the override" | token vencido o sin permisos → regenerar y actualizarlo en el Llavero |
| Llega a local pero el bot no responde | `docker compose logs -f sidekiq` y las ejecuciones de la copia `[LOCAL]` en n8n |
| El bot responde en staging en vez de local | override no activo → `lucia.sh status` |
| Staging dejó de recibir el número | quedó un override activo → `lucia.sh down` |
