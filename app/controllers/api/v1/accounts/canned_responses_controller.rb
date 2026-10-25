class Api::V1::Accounts::CannedResponsesController < Api::V1::Accounts::BaseController
  ALLOWED_FILE_TYPES = %w[image/jpeg image/png video/mp4 application/pdf].freeze

  before_action :fetch_canned_response, only: [:update, :destroy]
  before_action :fetch_blobs, only: [:create, :update]

  def index
    @canned_responses = canned_responses.with_attached_files
  end

  def create
    @canned_response = Current.account.canned_responses.new(canned_response_params)
    save_with_files { @canned_response.save! }
  end

  def update
    save_with_files { @canned_response.update!(canned_response_params) }
  end

  def destroy
    @canned_response.destroy!
    head :ok
  end

  private

  def fetch_canned_response
    @canned_response = Current.account.canned_responses.find(params[:id])
  end

  def fetch_blobs
    @blobs = Array(file_params[:attachments]).map { |signed_id| ActiveStorage::Blob.find_signed(signed_id) }
    error = blobs_error
    render_could_not_create_error(error) if error
  end

  def blobs_error
    return I18n.t('errors.attachments.invalid') if @blobs.any?(&:nil?)
    return I18n.t('errors.canned_responses.unsupported_file_type') unless @blobs.all? { |blob| ALLOWED_FILE_TYPES.include?(blob.content_type) }

    I18n.t('errors.canned_responses.file_too_large') if @blobs.any? { |blob| blob.byte_size > max_file_size }
  end

  # One transaction so the cache invalidation (after_commit) never reaches the dashboard before the files exist
  def save_with_files
    ActiveRecord::Base.transaction do
      yield
      @canned_response.files_attachments.where(id: file_params[:remove_attachment_ids]).find_each(&:destroy)
      @canned_response.files.attach(@blobs)
    end
    # Changing files alone does not fire the record's own after_commit
    @canned_response.update_account_cache
  end

  def max_file_size
    limit_mb = GlobalConfigService.load('MAXIMUM_FILE_UPLOAD_SIZE', 40).to_i
    (limit_mb.positive? ? limit_mb : 40).megabytes
  end

  def canned_response_params
    params.require(:canned_response).permit(:short_code, :content)
  end

  def file_params
    params.permit(attachments: [], remove_attachment_ids: [])
  end

  def canned_responses
    if params[:search]
      search = params[:search].delete("\0")
      Current.account.canned_responses
             .where('short_code ILIKE :search OR content ILIKE :search', search: "%#{search}%")
             .order_by_search(search)

    else
      Current.account.canned_responses
    end
  end
end
