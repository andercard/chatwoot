json.partial! 'api/v1/models/account', formats: [:json], resource: @account
json.latest_chatwoot_version @latest_chatwoot_version
json.picnic_release @picnic_release
json.latest_picnic_release @latest_picnic_release
json.partial! 'enterprise/api/v1/accounts/partials/account', account: @account if ChatwootApp.enterprise?
