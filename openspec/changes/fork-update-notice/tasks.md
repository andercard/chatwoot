# Tareas

- [x] **1 · Hornear PICNIC_RELEASE en la imagen**
  - archivos: `docker/Dockerfile`, `picnicart/scripts/build-image.sh`, `.github/workflows/picnic_release.yml`
  - depende de: ninguna
  - listo cuando: la etapa final del Dockerfile declara `ARG PICNIC_RELEASE` y `ENV PICNIC_RELEASE=${PICNIC_RELEASE}` (después de `FROM ruby:…-alpine`); `build-image.sh` pasa `--build-arg PICNIC_RELEASE="$TAG"`; `picnic_release.yml` pasa `build-args: PICNIC_RELEASE=${{ github.ref_name }}` en el paso `Build and push`
  - commit: `feat(release): bake PICNIC_RELEASE into the release image`

- [x] **2 · Job que consulta los tags del fork**
  - archivos: `app/jobs/internal/check_picnic_release_job.rb`, `lib/redis/redis_keys.rb`, `app/jobs/internal/trigger_daily_scheduled_items_job.rb`
  - depende de: ninguna
  - listo cuando: existe `Internal::CheckPicnicReleaseJob` (queue `scheduled_jobs`) que pide `https://api.github.com/repos/andercard/chatwoot/tags?per_page=100` con timeout, se queda con los nombres que casan `\Av\d+\.\d+\.\d+-picnic\.\d+\z`, elige el mayor por tupla `[X,Y,Z,N]` y lo guarda en `Redis::Alfred::LATEST_PICNIC_RELEASE` con `ex: 3.days`; ante cualquier excepción la reporta con `ChatwootExceptionTracker`, no la relanza y no sobrescribe el valor anterior; sin tags válidos no escribe nada; `redis_keys.rb` define la constante; `TriggerDailyScheduledItemsJob` programa el job (mismo `wait_until`) solo si `Rails.env.production?` y `ENV['PICNIC_RELEASE'].present?`
  - commit: `feat(updates): check the latest Picnic Art release from GitHub tags`

- [x] **3 · Exponer ambas versiones en la API de la cuenta**
  - archivos: `app/controllers/api/v1/accounts_controller.rb`, `app/views/api/v1/accounts/show.json.jbuilder`
  - depende de: 2
  - listo cuando: `GET /api/v1/accounts/:id` incluye `picnic_release` (el `PICNIC_RELEASE` instalado, `null` si falta o está vacío) y `latest_picnic_release` (lo guardado en Redis; solo se lee cuando `picnic_release` está presente, si no `null`); `latest_chatwoot_version` queda intacto
  - commit: `feat(updates): expose the installed and latest Picnic Art release in the account API`

- [x] **4 · Componente del aviso propio**
  - archivos: `app/javascript/dashboard/components-next/update-banner/PicnicUpdateBanner.vue`, `app/javascript/dashboard/constants/localStorage.js`, `app/javascript/dashboard/i18n/locale/en/generalSettings.json`, `app/javascript/dashboard/i18n/locale/es/generalSettings.json`
  - depende de: ninguna
  - listo cuando: `PicnicUpdateBanner` (`<script setup>`, props `installedRelease` y `latestRelease`) renderiza `dashboard/components/ui/Banner.vue` solo si es admin (`useAdmin`), `globalConfig.displayManifest`, ambas versiones presentes, `hasAnUpdateAvailable(latestRelease, installedRelease)` y la versión no está en `LOCAL_STORAGE_KEYS.DISMISSED_PICNIC_UPDATES`; el cierre guarda la versión en esa clave; el enlace va a `https://github.com/andercard/chatwoot/tags`; existen `GENERAL_SETTINGS.UPDATE_PICNIC_RELEASE` en `en` y `es` con el parámetro `{latestPicnicRelease}`
  - commit: `feat(updates): add the Picnic Art release update banner`

- [x] **5 · Mostrar el aviso junto al oficial**
  - archivos: `app/javascript/dashboard/App.vue`
  - depende de: 4
  - listo cuando: `App.vue` lee `picnic_release` y `latest_picnic_release` de la cuenta (como ya hace con `latest_chatwoot_version`, `App.vue:114-119`) y renderiza `<PicnicUpdateBanner>` justo debajo de `<UpdateBanner>`, sin modificar el aviso oficial
  - commit: `feat(updates): show the Picnic Art update banner next to the official one`

- [x] **6 · Documentar el aviso en el proceso de release**
  - archivos: `picnicart/docs/03-release-despliegue.md`
  - depende de: 1
  - listo cuando: la doc explica que la imagen lleva `PICNIC_RELEASE`, que el aviso compara contra los tags `vX.Y.Z-picnic.N` de GitHub una vez al día (retraso de hasta 24 h) y que sin esa variable el aviso no aparece
  - commit: `docs(release): document the Picnic Art update notice`
