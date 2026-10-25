json.id resource.id
json.account_id resource.account_id
json.short_code resource.short_code
json.content resource.content
json.created_at resource.created_at
json.updated_at resource.updated_at
json.files resource.files do |file|
  json.id file.id
  json.blob_id file.blob_id
  json.signed_id file.blob.signed_id
  json.filename file.filename.to_s
  json.content_type file.content_type
  json.byte_size file.byte_size
  json.file_type %w[image video].find { |type| file.content_type.start_with?("#{type}/") } || 'document'
  json.file_url url_for(file)
end
