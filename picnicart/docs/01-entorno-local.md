# 01 · Entorno local

Todo corre en Docker. En la Mac **no** hace falta Ruby, Node ni Postgres. Solo Docker Desktop (o OrbStack) actualizado y con al menos 8 GB de RAM asignados (10–12 GB recomendado).

## Qué contenedores hay

| Servicio | Qué es | Puerto en tu Mac |
|---|---|---|
| `rails` | Backend + API + sirve el frontend | **3005** → http://localhost:3005 |
| `vite` | Servidor de desarrollo del frontend (Vue) con recarga en caliente | 3036 (lo usa Rails internamente) |
| `sidekiq` | Jobs en segundo plano (webhooks, correos, WhatsApp saliente, automatizaciones) | — |
| `postgres` | Base de datos (Postgres 16 + pgvector) | 5432 |
| `redis` | Colas de Sidekiq, caché, websockets | 6379 |
| `mailhog` | Captura los correos que manda la app | 8025 → http://localhost:8025 |

El código **no** está dentro de la imagen: los contenedores montan tu carpeta (`./:/app`). Lo que editas en el editor lo ve el contenedor al instante.

## Dos entornos, dos bases de datos

Hay dos carpetas y cada una es un "proyecto" de Docker Compose con **su propia base de datos** (los volúmenes llevan el nombre de la carpeta):

| Carpeta | Rama | Para qué | BD |
|---|---|---|---|
| `~/Desarrollo/chatwoot` | `develop` y ramas `fix/*`, `feat/*` | Contribuir a Chatwoot (upstream) | volúmenes `chatwoot_*` |
| `~/Desarrollo/chatwoot-worktrees/production` | `production` y ramas `picnic/*` | Nuestro producto (lo que va a prod) | volúmenes `production_*` |

Se separan porque `develop` va varias migraciones por delante de la versión que corre en producción. Mezclar ambas en una misma base la deja en un estado que producción no tiene.

**Solo uno a la vez** (usan los mismos puertos). Para cambiar:

```bash
cd ~/Desarrollo/chatwoot && docker compose stop
cd ~/Desarrollo/chatwoot-worktrees/production && docker compose up -d
```

## Primera vez en una carpeta

1. Archivos locales (no se versionan; están en `.git/info/exclude`):
   ```bash
   cp picnicart/dev/docker-compose.override.example.yml ./docker-compose.override.yml
   cp .env.example .env
   ```
   En `.env` cambia:
   - `SECRET_KEY_BASE=` → resultado de `openssl rand -hex 64`
   - `FRONTEND_URL=http://localhost:3005`
   - `POSTGRES_PASSWORD=postgres`
   - `PICNIC_TS_IP=` → resultado de `tailscale ip -4`
   (`POSTGRES_HOST=postgres` y `REDIS_URL=redis://redis:6379` ya vienen bien para Docker.)
2. Construir imágenes (la primera vez tarda ~10 min):
   ```bash
   docker compose build base && docker compose build
   ```
3. Crear la base, cargar el esquema y los datos de ejemplo:
   ```bash
   docker compose up -d postgres redis
   docker compose run --rm rails bundle exec rails db:chatwoot_prepare
   ```
4. Levantar todo: `docker compose up -d`
5. Entrar a http://localhost:3005 con el usuario del seed (`john@acme.inc`; la contraseña de ejemplo está en `db/seeds.rb`: **cámbiala** si vas a exponer tu Mac a internet).

> La primera carga del navegador tarda 20–30 s (Vite compila módulo por módulo). Después es rápida.
> Cada vez que el contenedor `vite` arranca corre `pnpm install --force` (~1,5 min). Espera a ver `VITE ready` en `docker compose logs vite` antes de abrir la app.

## Abrirlo desde el celular (y qué puertos quedan abiertos)

Política de exposición del override: **nada escucha en la red local (LAN) ni en `0.0.0.0`**.
- Postgres, Redis, Mailhog y Vite: solo `127.0.0.1`.
- La app (3005): `127.0.0.1` y la IP de **Tailscale** de la Mac (`tailscale ip -4`).

| Dónde está el celular | URL |
|---|---|
| Con la app de Tailscale abierta (cualquier red) | `http://<IP de Tailscale de la Mac>:3005` (o `http://<nombre-de-la-Mac>.<tailnet>.ts.net:3005`) |
| Necesitas HTTPS (cámara, micrófono, notificaciones push, PWA) | la URL HTTPS de la Mac en Tailscale (`tailscale serve`, solo tu red privada) |

Requisitos: Tailscale debe estar encendido **antes** de `docker compose up` (la app se publica en esa dirección; si no, Docker falla al arrancar con "cannot assign requested address") y la variable `PICNIC_TS_IP` en `.env` debe tener el valor de `tailscale ip -4` (`lucia.sh up` la sincroniza).

En el celular la recarga automática de Vite (HMR) no conecta: después de un cambio de front, recarga la página a mano. El primer acceso tarda ~30 s porque Vite sirve cientos de módulos sueltos.

## ¿Mis cambios se ven en vivo?

| Cambio | ¿Qué hago? |
|---|---|
| Vue / JS / CSS (`app/javascript/**`) | Nada: se actualiza solo en el navegador (HMR) |
| Ruby en `app/`, `lib/`, `enterprise/` (controllers, modelos, servicios, vistas) | Recargar el navegador |
| Jobs de Sidekiq | `docker compose restart sidekiq` |
| `Gemfile`, `config/initializers/**`, `config/*.yml`, `.env`, `docker-compose*` | `docker compose up -d` (recrea lo necesario) o `docker compose restart rails sidekiq` |
| `package.json`, `vite.config.ts` | `docker compose restart vite` |
| Nueva migración | `docker compose exec rails bundle exec rails db:migrate` |
| Nuevas traducciones en `en.json` | Recargar el navegador |

## Cuándo levantar qué

- **Desarrollo normal (front + back):** `docker compose up -d` (todo).
- **Solo correr specs:** basta con `postgres` y `redis` arriba + `docker compose run --rm -e RAILS_ENV=test rails bundle exec rspec <ruta>`.
- **Probar WhatsApp / webhooks entrantes:** todo + túnel HTTPS (ver guía 04).
- **No vas a trabajar:** `docker compose stop` (libera RAM, conserva datos).
- **Specs por primera vez:** `docker compose exec -e RAILS_ENV=test rails bundle exec rails db:schema:load`.

⚠️ Dentro del contenedor `RAILS_ENV=development`. Para specs **siempre** pasa `-e RAILS_ENV=test`, o correrían contra tu base de desarrollo.

## Si algo se rompe

| Síntoma | Causa probable | Solución |
|---|---|---|
| Página en blanco, consola con 403 de `/vite-dev/...` | Vite no acepta el host `vite` | Revisa que el override tenga `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=vite`; `docker compose restart vite` |
| Error 500 "Vite Ruby can't find entrypoints/v3app.js" | Rails no encuentra Vite (aún instalando o mal configurado) | Espera a `VITE ready`; revisa `VITE_RUBY_HOST` en el override; `docker compose restart rails` |
| `postgres` reiniciándose en bucle | Falta contraseña | `POSTGRES_PASSWORD` en el override y en `.env` |
| `A server is already running` / pid | PID viejo | `docker compose restart rails` (el entrypoint borra el pid) |
| Puerto ocupado | Otro proceso u otro entorno arriba | `docker compose ls` y `stop` el otro proyecto; `lsof -i :3005` |
| `PendingMigrationError` | Cambiaste de rama | `docker compose exec rails bundle exec rails db:migrate` |
| Gems faltantes tras cambiar de rama | Gemfile distinto | `docker compose exec rails bundle install && docker compose restart rails sidekiq` |
| Paquetes JS faltantes | package.json distinto | `docker compose restart vite` (reinstala) |
| Docker no responde / contenedor en `Created` | Docker Desktop colgado | Salir de Docker Desktop y abrirlo de nuevo |
| Todo raro y no sabes por qué | Estado corrupto | Reset (abajo) |

## Resetear

De menos a más destructivo:

```bash
docker compose restart rails vite sidekiq                 # reinicio suave
docker compose down && docker compose up -d               # recrea contenedores, conserva datos
docker compose exec rails bundle exec rails db:reset      # ⚠️ borra la BD de desarrollo y vuelve a sembrar
docker compose down -v                                    # ⚠️ borra TODOS los volúmenes (BD, gems, node_modules)
docker compose build --no-cache base && docker compose build   # reconstruir imágenes desde cero
```

Después de `down -v` repite los pasos 3 y 4 de "Primera vez".

## Por qué el front tarda en cargar en desarrollo

Es normal en modo desarrollo y no es un fallo de configuración:

- **Sin empaquetar:** Vite sirve cada archivo como módulo suelto; la pantalla de login pide ~250 archivos y el panel completo muchos más (las traducciones de todos los idiomas se importan juntas). En producción son unos pocos archivos empaquetados.
- **Proxy de Rails:** el navegador pide los módulos a Rails (puerto 3005) y Rails los reenvía a Vite; cada módulo tarda ~75 ms en vez de ~9 ms directo.
- **Docker en Mac:** la carpeta del proyecto se monta desde macOS (más lento que el disco de Linux) y todo corre en una VM con recursos limitados.
- **rack-mini-profiler:** perfila cada petición en desarrollo; `lucia.sh up` pone `DISABLE_MINI_PROFILER=true` en el `.env` local. Si no usas Lucía, añade esa línea a mano y recrea `rails`.
- **Primera carga tras recrear contenedores:** Vite reoptimiza dependencias (~15–20 s la primera vez); las siguientes cargas son más rápidas.

Para ver el rendimiento real (como en producción) usa la imagen construida, no el entorno de desarrollo.

## Idiomas en dev (carga más rápida)

En desarrollo Vite solo carga los idiomas `en` y `es` (antes servía ~1.900 JSON de traducciones de los 43 idiomas, 84 % de los módulos del login). Para cambiarlo: variable `VITE_DEV_LOCALES` en el servicio `vite` del `docker-compose.override.yml` (ej. `en,es,pt_BR`, o `all` para todos) y `docker compose restart vite`. Un idioma no cargado muestra las claves en vez del texto. No afecta al build de producción.
