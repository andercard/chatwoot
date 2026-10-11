# Verificación · fork-update-notice

```yaml
veredicto: pasa
ronda: 1
fecha: 2026-10-11
tareas_a_medias: []
cumplidas: 6/6
a_medias: 0
de_mas: 0
comandos:
  - cmd: grep -c PICNIC_RELEASE docker/Dockerfile picnicart/scripts/build-image.sh .github/workflows/picnic_release.yml
    exit: 0
    esperado: "cada archivo >= 1"
    obtenido: "Dockerfile 2 · build-image.sh 1 · picnic_release.yml 1"
    coincide: true
  - cmd: bash -n picnicart/scripts/build-image.sh
    exit: 0
    esperado: "exit 0"
    obtenido: "exit 0"
    coincide: true
  - cmd: ruby -ryaml -e 'YAML.load_file(".github/workflows/picnic_release.yml")'  # contenedor efímero, sin tocar el stack
    exit: 0
    esperado: "exit 0"
    obtenido: "exit 0"
    coincide: true
  - cmd: "rails runner Internal::CheckPicnicReleaseJob.perform_now + get/ttl de LATEST_PICNIC_RELEASE (criterio 2)"
    exit: null
    esperado: "línea ^v\\d+\\.\\d+\\.\\d+-picnic\\.\\d+$ >= v4.17.1-picnic.2; ttl entre 1 y 259200"
    obtenido: "no ejecutado: el stack Docker monta otro worktree (production, rama ajena con cambios sin commitear)"
    coincide: no_verificado
  - cmd: "runner con RestClient::Request.execute que lanza SocketError (criterio 3)"
    exit: null
    esperado: "no lanza y el valor en Redis no cambia"
    obtenido: "no ejecutado: mismo motivo"
    coincide: no_verificado
  - cmd: "GET /api/v1/accounts/<id> con y sin PICNIC_RELEASE (criterio 4)"
    exit: null
    esperado: "picnic_release y latest_picnic_release presentes; sin la variable ambos null; latest_chatwoot_version siempre"
    obtenido: "no ejecutado: mismo motivo"
    coincide: no_verificado
  - cmd: "aviso en el navegador, admin/agente, descarte y reaparición (criterio 5)"
    exit: null
    esperado: "aparece solo con versión mayor, admin y PICNIC_RELEASE; descarte persistente por versión; convive con el oficial"
    obtenido: "no ejecutado: mismo motivo"
    coincide: no_verificado
  - cmd: "eslint sobre PicnicUpdateBanner.vue, App.vue, localStorage.js y los 2 generalSettings.json; rubocop sobre los 4 .rb (criterio 6)"
    exit: null
    esperado: "0 errores / 0 ofensas"
    obtenido: "no ejecutado: el worktree no tiene node_modules ni bundle; commits con --no-verify"
    coincide: no_verificado
  - cmd: git diff --stat 2a2dd20a99..HEAD
    exit: 0
    esperado: "solo archivos declarados en las tareas + openspec/changes/fork-update-notice/"
    obtenido: "16 archivos: los 14 declarados + proposal.md + tasks.md"
    coincide: true
  - cmd: calcifer check 2a2dd20a99
    exit: 0
    esperado: "sin hallazgos"
    obtenido: "sin hallazgos, pero 'SIN REVISAR': ningún validador del repo cubre estos archivos"
    coincide: true
```

Las 6 tareas cumplen su `listo cuando` en el código y solo se tocaron archivos declarados. El veredicto se apoya en los controles 1 y 7 más validación de sintaxis (`ruby -c` en los 4 `.rb` y el jbuilder, YAML del workflow, JSON de i18n). Los controles 2 a 6 (job contra GitHub, tolerancia a fallos, API, aviso en el navegador, lint) siguen `no_verificado`: necesitan el stack Docker apuntando a este worktree.

Nota para el review: `hasAnUpdateAvailable` solo valida con semver la versión `latest`; si `PICNIC_RELEASE` llegara con un valor no semver, `semver.lt` lanzaría. Hoy no ocurre porque la variable siempre sale del tag.
