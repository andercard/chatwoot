class Internal::CheckPicnicReleaseJob < ApplicationJob
  queue_as :scheduled_jobs

  TAGS_URL = 'https://api.github.com/repos/andercard/chatwoot/tags?per_page=100'.freeze
  TAG_FORMAT = /\Av(\d+)\.(\d+)\.(\d+)-picnic\.(\d+)\z/

  def perform
    response = RestClient::Request.execute(method: :get, url: TAGS_URL, headers: { accept: 'application/vnd.github+json' }, timeout: 10)
    tags = JSON.parse(response.body).pluck('name').grep(TAG_FORMAT)
    latest = tags.max_by { |tag| tag.match(TAG_FORMAT).captures.map(&:to_i) }
    ::Redis::Alfred.set(::Redis::Alfred::LATEST_PICNIC_RELEASE, latest, ex: 3.days) if latest
  rescue StandardError => e
    ChatwootExceptionTracker.new(e).capture_exception
  end
end
