# 03 · Release y despliegue

## Cómo está producción hoy

Docker Compose en un servidor propio, con la app web y el worker de Sidekiq (imagen oficial `chatwoot/chatwoot:<versión>`), Postgres y Redis. Los nombres de servicios, dominios y detalles del servidor son privados: están en las notas locales (`~/.config/picnicart/`), no en este repositorio.

- **Arquitectura del servidor:** x86_64 → imágenes `linux/amd64`. La RAM es limitada: **no construir imágenes en el servidor**; construir en la Mac o en GitHub Actions y solo hacer `pull`.
- **Staging no es una instancia aparte**: es una cuenta de la misma instancia que producción. Desplegar una imagen nueva cambia staging y producción a la vez. Por eso toda prueba previa se hace en local (guías 01 y 05) y los despliegues van con respaldo.

El objetivo es reemplazar la imagen oficial por la nuestra, `andercard/chatwoot:<tag>`, construida desde la rama `production`.

## Versionado de imágenes

`v<versión de Chatwoot>-picnic.<n>` → ej. `v4.17.1-picnic.1`, `v4.17.1-picnic.2`, `v4.18.0-picnic.1`.

- Tags **inmutables**: nunca se vuelve a subir el mismo tag. El servidor siempre apunta a un tag concreto (no `latest`), así el rollback es cambiar el tag.
- El mismo nombre se usa como tag de Git en el commit de `production` que se construyó.

## Release paso a paso

1. **Todo mergeado en `production`** (PRs `picnic/*` aprobados, CI/pr-ready verde).
2. **Etiquetar:**
   ```bash
   cd ~/Desarrollo/chatwoot-worktrees/production
   git switch production && git pull
   git tag v4.17.1-picnic.N && git push origin v4.17.1-picnic.N
   ```
3. **Construir y subir la imagen** (una vez: `docker login -u andercard` con un *access token* de Docker Hub, no la contraseña):
   ```bash
   picnicart/scripts/build-image.sh v4.17.1-picnic.N --push
   ```
   Construye `linux/amd64` desde `docker/Dockerfile` (modo producción, assets precompilados) **a partir de un clon limpio del tag** (no del directorio de trabajo): el Dockerfile ejecuta `git rev-parse HEAD`, que falla dentro de un worktree, y así el build es reproducible y no arrastra archivos locales. La carpeta `picnicart/` se quita del contexto para que no quede en la imagen pública. En una Mac Apple Silicon se emula amd64: la primera vez tarda ~1 h (la instalación de gems es lo más lento, ~50 min); con la caché de Docker las siguientes son de ~10 min. Ver alternativa con GitHub Actions abajo.
   Antes de subir, comprueba la imagen: `docker run --rm --platform linux/amd64 --entrypoint cat andercard/chatwoot:<tag> /app/VERSION_CW` (debe mostrar la versión de Chatwoot) y luego `docker push andercard/chatwoot:<tag>`.
4. **Revisar migraciones nuevas** respecto a lo desplegado:
   ```bash
   git diff --name-only <tag-desplegado>..v4.17.1-picnic.N -- db/migrate
   ```
   Si hay migraciones: respaldo de la BD antes de desplegar (paso 5).
5. **Respaldo** (en el servidor):
   ```bash
   docker exec <contenedor-postgres> pg_dump -U <usuario> -Fc <base> > chatwoot_$(date +%F_%H%M).dump
   ```
6. **Desplegar** (en el servidor, en la carpeta del `docker-compose.yml`):
   - Cambiar `image:` de el servicio web y el worker a `andercard/chatwoot:v4.17.1-picnic.N` (los dos con el mismo tag, siempre).
   - ```bash
     docker compose pull <servicio-web> <servicio-worker>
     docker compose run --rm <servicio-web> bundle exec rails db:chatwoot_prepare   # migra si hay pendientes
     docker compose up -d <servicio-web> <servicio-worker>
     ```
   (Ajusta los nombres de servicio a los que tenga el compose del servidor.)
7. **Verificar:**
   - `curl -s https://<dominio-de-produccion>/api | jq` → `queue_services: "ok"`, `data_services: "ok"`, versión correcta.
   - `docker compose logs --tail 100 <servicio-web> <servicio-worker>` sin errores.
   - Entrar a la cuenta de staging, enviar y recibir un WhatsApp de prueba.

## Rollback

1. Volver `image:` al tag anterior (o a `chatwoot/chatwoot:v4.17.1`) en ambos servicios → `docker compose up -d …`.
2. Si la release tenía migraciones **destructivas** (borran/renombran columnas): restaurar el respaldo (`pg_restore -c -d chatwoot …`). Las migraciones aditivas (agregar columnas/tablas/índices) no requieren restaurar: el código anterior las ignora.
3. Anotar qué falló en el PR/issue antes de reintentar.

## Actualizar la versión de Chatwoot

Cuando Chatwoot publique una versión nueva (ej. `v4.18.0`):

```bash
cd ~/Desarrollo/chatwoot-worktrees/production
git fetch upstream --tags
git switch -c picnic/chore/upgrade-v4.18.0 production
git merge v4.18.0            # resolver conflictos: solo aparecen donde editamos archivos de Chatwoot
```

- Leer las release notes de Chatwoot (breaking changes, migraciones pesadas, variables nuevas).
- Probar en el entorno local de `production` (`db:migrate`, flujo de WhatsApp, specs de lo nuestro).
- PR a `production` → release `v4.18.0-picnic.1` siguiendo los pasos de arriba (con respaldo, porque una actualización siempre trae migraciones).
- Nunca saltar a `develop` de Chatwoot en producción: solo tags de release.

## Alternativa: construir en GitHub Actions

Más rápido que emular amd64 en la Mac. Requiere:
1. Darle a `gh` el permiso `workflow` (`gh auth refresh -h github.com -s workflow`).
2. Crear en Docker Hub un *access token* y guardarlo como secreto `DOCKERHUB_TOKEN` en `andercard/chatwoot` → Settings → Secrets → Actions (esto lo hace una persona; el token nunca va en el código).
3. Un workflow que, al empujar un tag `v*-picnic.*`, construya `docker/Dockerfile` y haga push a `andercard/chatwoot:<tag>`.

Ojo: el fork tiene Actions habilitadas y hereda los workflows de Chatwoot (publicar imágenes oficiales, etc.). Antes de usar Actions hay que deshabilitar los que no aplican.
