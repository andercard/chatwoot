# Chatwoot · Picnic Art

Fork propio de Chatwoot (`andercard/chatwoot`) con los cambios de Picnic Art. Esta carpeta solo existe en la rama `production` del fork; nunca se manda a Chatwoot (upstream).

| Guía | Para qué |
|---|---|
| [01 · Entorno local](docs/01-entorno-local.md) | Levantar, apagar, ver cambios en vivo, resetear, solucionar problemas |
| [02 · Flujo de trabajo Git](docs/02-flujo-git.md) | Ramas, commits, PRs a nuestro fork y PRs a Chatwoot |
| [03 · Release y despliegue](docs/03-release-despliegue.md) | Construir la imagen, subirla a Docker Hub, desplegar y hacer rollback |
| [05 · Lucía en local](docs/05-lucia-local.md) | **Probar el chatbot completo en local con un comando** (`picnicart/dev/lucia.sh up` / `down`) |

## Mapa rápido

```
GitHub
  chatwoot/chatwoot  (upstream)     develop = desarrollo de Chatwoot · tags vX.Y.Z = releases
  andercard/chatwoot (origin, fork) production = release de Chatwoot que corre en prod + nuestros cambios

Disco
  ~/Desarrollo/chatwoot                         checkout principal → ramas basadas en upstream/develop (PRs a Chatwoot)
  ~/Desarrollo/chatwoot-worktrees/production    worktree → rama production y ramas picnic/* (nuestro producto)

Docker Hub
  andercard/chatwoot:<vX.Y.Z-picnic.N>          imagen que despliega el servidor

Servidor (producción)
  Docker Compose con la app web y el worker de Sidekiq, Postgres y Redis
```

## Comandos de todos los días

| Quiero… | Comando (desde la carpeta del entorno) |
|---|---|
| Levantar todo | `docker compose up -d` |
| Ver logs | `docker compose logs -f rails vite sidekiq` |
| Apagar (conserva datos) | `docker compose stop` |
| Consola Rails | `docker compose exec rails bundle exec rails c` |
| Correr specs | `docker compose exec -e RAILS_ENV=test rails bundle exec rspec <ruta>` |
| Migrar | `docker compose exec rails bundle exec rails db:migrate` |

App en http://localhost:3005 · Celular: `http://<IP de la Mac>:3005` o vía Tailscale · Correos de prueba en http://localhost:8025

Chatbot (WhatsApp de prueba + n8n staging): `picnicart/dev/lucia.sh up` … `picnicart/dev/lucia.sh down`

> Los valores privados (servidor, dominios, IDs de Meta, etc.) **no** están en este repositorio: viven en `~/.config/picnicart/env` en tu máquina. Plantilla: [`dev/env.example`](dev/env.example).
