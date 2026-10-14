> **Rama:** `picnic/feat/fork-update-notice`
> **Base:** `2a2dd20a99`

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más.

# Aviso de versión propia (vX.Y.Z-picnic.N) junto al aviso oficial de Chatwoot

## Qué encontré

Evidencia leída en `~/Desarrollo/chatwoot-worktrees/fork-update-notice` (rama `picnic/feat/fork-update-notice`, base `production` `2a2dd20a99`). **No hay `.codegraph/` en este worktree**: el flujo se siguió con `codegraph_context` sobre el checkout `develop` (mismo mecanismo) y con lectura directa de los archivos de este worktree. No existe rama ni change previo con este tema.

- **Aviso oficial, de punta a punta.** `app/jobs/internal/check_new_versions_job.rb:4-17`: solo en `production`, pide la versión al hub y la guarda en Redis (`Redis::Alfred::LATEST_CHATWOOT_VERSION`, `lib/redis/redis_keys.rb:74`). Se programa una vez al día desde `app/jobs/internal/trigger_daily_scheduled_items_job.rb:12-22` (`schedule_version_check`, con minuto fijo por instalación). `app/controllers/api/v1/accounts_controller.rb:19-21,73-75` lo lee y `app/views/api/v1/accounts/show.json.jbuilder:2` lo expone como `latest_chatwoot_version`. `app/javascript/dashboard/App.vue:114-119,143` lo pasa a `UpdateBanner`, que lo muestra solo a admins si `globalConfig.displayManifest`, hay actualización (`versionCheckHelper.js`: `semver.lt(actual, última)`) y no se descartó (`LOCAL_STORAGE_KEYS.DISMISSED_UPDATES`, `constants/localStorage.js:2`). `appVersion` sale de `config/app.yml:2` (`4.17.1`), por eso el aviso oficial ya es correcto para el fork.
- **Solo hay tags, no Releases.** `picnicart/docs/03-release-despliegue.md:26,89` y `picnic_release.yml:7-9`: el release es `git tag vX.Y.Z-picnic.N && git push origin <tag>`, que dispara el build de la imagen. Comprobado: `git ls-remote --tags origin 'v*-picnic.*'` → `v4.17.1-picnic.1`, `v4.17.1-picnic.2`; `GET api.github.com/repos/andercard/chatwoot/tags` → HTTP 200 con esos dos; `GET …/releases` → **0 objetos**. Rate limit sin token: 60/h (suficiente para 1 consulta al día). Por eso la fuente es el endpoint `/tags`, no `/releases`.
- **La imagen no sabe su versión propia.** `picnicart/scripts/build-image.sh:15-40` y `.github/workflows/picnic_release.yml` (paso `Build and push`) solo pasan labels OCI; `docker/Dockerfile` (etapa final, desde la línea ~99) no declara ningún `ARG/ENV` de versión. Hay que hornear `PICNIC_RELEASE` en los dos caminos de build.
- **Compatibilidad semver.** `semver` acepta `v4.17.1-picnic.2` y ordena `-picnic.N` numéricamente (`4.17.1-picnic.2 < 4.17.1-picnic.10`), así que `hasAnUpdateAvailable(última, actual)` sirve tal cual para el fork. En Ruby se compara con la tupla `[X,Y,Z,N]` (no `Gem::Version`, que trata `-` como prerelease).
- **Enterprise:** `enterprise/app/controllers/enterprise/api/v1/accounts_settings.rb` solo sobreescribe `latest_chatwoot_version` (oculta el aviso en la nube de Chatwoot); no toca los campos nuevos. `CheckNewVersionsJob` y `TriggerDailyScheduledItemsJob` terminan con `prepend_mod_with`; añadir un método privado no choca.

## Qué propongo, y qué queda afuera

Un segundo aviso, independiente y al lado del oficial: «Nueva versión de Picnic Art vX.Y.Z-picnic.N disponible». Un job diario propio consulta los tags del fork en GitHub, guarda el mayor en Redis con TTL, la API lo expone junto a la versión instalada (`PICNIC_RELEASE`, horneada en la imagen) y un banner nuevo lo muestra a admins cuando hay una versión mayor. Si la instalación no tiene `PICNIC_RELEASE` (local/dev), el aviso no existe. El job oficial no se toca: un fallo de GitHub nunca lo afecta.

Condicionales: solo `production`; solo con `PICNIC_RELEASE` presente; solo admins y solo si `displayManifest` (igual que el oficial); solo tags con forma exacta `vX.Y.Z-picnic.N` (descarta `-rc`, `-beta`, etc.; los drafts/prereleases no existen en tags y `/releases` está vacío); comparación numérica por tupla; TTL de 3 días en Redis; cualquier error de red/rate-limit/JSON se registra con `ChatwootExceptionTracker` y se conserva el valor anterior; descarte por versión en `localStorage` con clave propia.

**No entra:** línea equivalente en `BuildInfo.vue` (Ajustes → cuenta); comprobar en Docker Hub que la imagen ya está publicada (el tag existe unos minutos u horas antes de que termine el build: el aviso puede adelantarse); token de GitHub; soporte de GitHub Releases; specs (CLAUDE.md: solo si se piden); el port a `develop`/upstream; actualizar automáticamente la instancia; consulta al arrancar (el primer aviso llega en el próximo ciclo diario, hasta 24 h).

## Con qué restricciones

- **Rules (`calcifer rules`)**: `jobs.md` (heredar `ApplicationJob`, `queue_as :scheduled_jobs`, log con prefijo `[#{self.class.name}]`, errores tragados vía `ChatwootExceptionTracker`, idempotente); `controllers.md`; `vue-components.md` y `design-foundations.md` (componente nuevo en `components-next/`, `<script setup>`, props con objeto runtime, solo Tailwind, sin strings desnudos); `i18n.md`.
- **CLAUDE.md del repo**: Ruby con `class A::B` compacto; menor cambio posible; sin helpers de un solo uso; fallar fuerte ante estados de despliegue imposibles; HTTP con `RestClient` (ya dependencia, usado en `lib/chatwoot_hub.rb`), con timeout explícito.
- **Higiene para seguir al día con upstream (el objetivo de fondo):** toda la lógica nueva va en archivos nuevos; en archivos de upstream solo se agregan 1–3 líneas aditivas (`redis_keys.rb`, `trigger_daily_scheduled_items_job.rb`, `accounts_controller.rb`, `show.json.jbuilder`, `App.vue`, `localStorage.js`, `Dockerfile`, los dos `generalSettings.json`).
- **i18n (decisión asumida):** se agrega la clave en `en/generalSettings.json` **y** `es/generalSettings.json`, porque es una función solo del fork y Crowdin no la va a traducir. Es una excepción consciente a «solo en.json» del CLAUDE.md, que rige para PRs upstream.
- **Lint/verificación:** el stack Docker actual monta otro worktree (ver «Preguntas abiertas»); los subagentes de apply **no** corren eslint/rubocop sobre este worktree. Todo eso queda para el verify.

## Preguntas abiertas

- **Stack de verificación.** El worktree `~/Desarrollo/chatwoot-worktrees/production` está ahora en `picnic/feat/whatsapp-image-compression` con cambios sin commitear (no míos), y es lo que montan los contenedores de `localhost:3005`. Para verificar este cambio hay que apuntar el stack a `fork-update-notice` (copiar `.env` y `docker-compose.override.yml`, parar el otro entorno, `up -d`). Supuesto mientras tanto: no se toca nada de ese worktree; el verify pregunta antes de cambiar el stack.

## Encontrado de paso

- `.github/workflows/publish_foss_docker.yml:10-14` y `publish_ee_docker.yml:10-14` también se disparan con tags `v*`, y `v4.17.1-picnic.N` coincide. Probablemente fallen o se salten en el fork por falta de secretos; no se comprobó. Por qué no aquí: es CI de release, no del aviso.
- `picnicart-release` (skill local, `~/Desarrollo/chatwoot/.agents/skills/picnicart-release/SKILL.md`) no menciona `PICNIC_RELEASE`; conviene una línea tras este cambio. No es repo versionado.

## Tareas

- [ ] **1 · Hornear PICNIC_RELEASE en la imagen**
  - archivos: `docker/Dockerfile`, `picnicart/scripts/build-image.sh`, `.github/workflows/picnic_release.yml`
  - depende de: ninguna
  - listo cuando: la etapa final del Dockerfile declara `ARG PICNIC_RELEASE` y `ENV PICNIC_RELEASE=${PICNIC_RELEASE}` (después de `FROM ruby:…-alpine`); `build-image.sh` pasa `--build-arg PICNIC_RELEASE="$TAG"`; `picnic_release.yml` pasa `build-args: PICNIC_RELEASE=${{ github.ref_name }}` en el paso `Build and push`
  - commit: `feat(release): bake PICNIC_RELEASE into the release image`

- [ ] **2 · Job que consulta los tags del fork**
  - archivos: `app/jobs/internal/check_picnic_release_job.rb`, `lib/redis/redis_keys.rb`, `app/jobs/internal/trigger_daily_scheduled_items_job.rb`
  - depende de: ninguna
  - listo cuando: existe `Internal::CheckPicnicReleaseJob` (queue `scheduled_jobs`) que pide `https://api.github.com/repos/andercard/chatwoot/tags?per_page=100` con timeout, se queda con los nombres que casan `\Av\d+\.\d+\.\d+-picnic\.\d+\z`, elige el mayor por tupla `[X,Y,Z,N]` y lo guarda en `Redis::Alfred::LATEST_PICNIC_RELEASE` con `ex: 3.days`; ante cualquier excepción la reporta con `ChatwootExceptionTracker`, no la relanza y no sobrescribe el valor anterior; sin tags válidos no escribe nada; `redis_keys.rb` define la constante; `TriggerDailyScheduledItemsJob` programa el job (mismo `wait_until`) solo si `Rails.env.production?` y `ENV['PICNIC_RELEASE'].present?`
  - commit: `feat(updates): check the latest Picnic Art release from GitHub tags`

- [ ] **3 · Exponer ambas versiones en la API de la cuenta**
  - archivos: `app/controllers/api/v1/accounts_controller.rb`, `app/views/api/v1/accounts/show.json.jbuilder`
  - depende de: 2
  - listo cuando: `GET /api/v1/accounts/:id` incluye `picnic_release` (el `PICNIC_RELEASE` instalado, `null` si falta o está vacío) y `latest_picnic_release` (lo guardado en Redis; solo se lee cuando `picnic_release` está presente, si no `null`); `latest_chatwoot_version` queda intacto
  - commit: `feat(updates): expose the installed and latest Picnic Art release in the account API`

- [ ] **4 · Componente del aviso propio**
  - archivos: `app/javascript/dashboard/components-next/update-banner/PicnicUpdateBanner.vue`, `app/javascript/dashboard/constants/localStorage.js`, `app/javascript/dashboard/i18n/locale/en/generalSettings.json`, `app/javascript/dashboard/i18n/locale/es/generalSettings.json`
  - depende de: ninguna
  - listo cuando: `PicnicUpdateBanner` (`<script setup>`, props `installedRelease` y `latestRelease`) renderiza `dashboard/components/ui/Banner.vue` solo si es admin (`useAdmin`), `globalConfig.displayManifest`, ambas versiones presentes, `hasAnUpdateAvailable(latestRelease, installedRelease)` y la versión no está en `LOCAL_STORAGE_KEYS.DISMISSED_PICNIC_UPDATES`; el cierre guarda la versión en esa clave; el enlace va a `https://github.com/andercard/chatwoot/tags`; existen `GENERAL_SETTINGS.UPDATE_PICNIC_RELEASE` en `en` y `es` con el parámetro `{latestPicnicRelease}`
  - commit: `feat(updates): add the Picnic Art release update banner`

- [ ] **5 · Mostrar el aviso junto al oficial**
  - archivos: `app/javascript/dashboard/App.vue`
  - depende de: 4
  - listo cuando: `App.vue` lee `picnic_release` y `latest_picnic_release` de la cuenta (como ya hace con `latest_chatwoot_version`, `App.vue:114-119`) y renderiza `<PicnicUpdateBanner>` justo debajo de `<UpdateBanner>`, sin modificar el aviso oficial
  - commit: `feat(updates): show the Picnic Art update banner next to the official one`

- [ ] **6 · Documentar el aviso en el proceso de release**
  - archivos: `picnicart/docs/03-release-despliegue.md`
  - depende de: 1
  - listo cuando: la doc explica que la imagen lleva `PICNIC_RELEASE`, que el aviso compara contra los tags `vX.Y.Z-picnic.N` de GitHub una vez al día (retraso de hasta 24 h) y que sin esa variable el aviso no aparece
  - commit: `docs(release): document the Picnic Art update notice`

## Cómo se verifica

Este cambio **sí altera comportamiento visible** (aparece un aviso nuevo y dos campos nuevos en la API). Todo el código nuevo se verifica por forma e invariantes: ningún comando de abajo existía antes del cambio, así que los valores marcados *provisional* los fija la ronda 1 del verify. Requiere el stack apuntado a este worktree (ver «Preguntas abiertas»); `RAILS_ENV=development` en el contenedor.

1. **Plomería de build** (invariante, desde el worktree): `grep -c PICNIC_RELEASE docker/Dockerfile picnicart/scripts/build-image.sh .github/workflows/picnic_release.yml` → cada archivo ≥ 1 (cota, no igualdad); `bash -n picnicart/scripts/build-image.sh` → exit 0; el YAML del workflow parsea (`ruby -ryaml -e 'YAML.load_file(".github/workflows/picnic_release.yml")'` en el contenedor) → exit 0.
2. **Job contra GitHub real:** `docker compose exec -e PICNIC_RELEASE=v4.17.1-picnic.1 rails bundle exec rails runner 'Internal::CheckPicnicReleaseJob.perform_now; puts Redis::Alfred.get(Redis::Alfred::LATEST_PICNIC_RELEASE)'` → imprime una línea que casa `^v\d+\.\d+\.\d+-picnic\.\d+$` y es **≥ `v4.17.1-picnic.2`** (cota: hoy son los dos tags que existen). `Redis::Alfred.ttl(Redis::Alfred::LATEST_PICNIC_RELEASE)` → entero entre 1 y 259200.
3. **Tolerancia a fallos:** con el valor ya guardado, un runner que haga `RestClient::Request.define_singleton_method(:execute) { |*| raise SocketError, 'boom' }` y luego `Internal::CheckPicnicReleaseJob.perform_now` → **no lanza** y `Redis::Alfred.get(...)` devuelve el mismo valor de antes.
4. **API:** con `PICNIC_RELEASE=v4.17.1-picnic.1` en el contenedor `rails`, `GET /api/v1/accounts/<id>` (desde la sesión del navegador) trae las claves `picnic_release` = `"v4.17.1-picnic.1"` y `latest_picnic_release`; sin la variable ambas son `null`; `latest_chatwoot_version` sigue presente en los dos casos.
5. **Aviso en el navegador (admin, viewport ancho):** con `PICNIC_RELEASE=v4.17.1-picnic.1` y `LATEST_PICNIC_RELEASE=v4.17.1-picnic.2` en Redis, aparece el banner con el texto en español y el enlace a `…/andercard/chatwoot/tags`; con ambas iguales no aparece; con `PICNIC_RELEASE` sin definir no aparece; al cerrarlo no vuelve tras recargar, y con `…picnic.3` en Redis vuelve a aparecer; como agente (no admin) no aparece. El banner oficial sigue funcionando y los dos conviven cuando ambos aplican.
6. **Lint:** `eslint` (binario directo, sin `--fix`) sobre `PicnicUpdateBanner.vue`, `App.vue`, `localStorage.js` y los dos `generalSettings.json` → 0 errores; `docker compose exec rails bundle exec rubocop` sobre los 4 `.rb` tocados → 0 ofensas.
7. **Alcance:** `git diff --stat 2a2dd20a99..HEAD` lista solo los archivos declarados en las tareas más `openspec/changes/<este change>/`; el diff incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más.
