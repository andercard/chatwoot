import inboxes from '../../api/inboxes';
import {
  CATALOG_CACHE_TTL,
  clearCatalogCache,
  loadCatalog,
  prefetchCatalog,
} from '../whatsappCatalogCache';

vi.mock('../../api/inboxes', () => ({
  default: { getWhatsappCatalog: vi.fn() },
}));

const okData = { status: 'ok', catalog_id: '1', collections: [], products: [] };

describe('whatsappCatalogCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearCatalogCache();
    inboxes.getWhatsappCatalog.mockReset();
    inboxes.getWhatsappCatalog.mockResolvedValue({ data: okData });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shares one request between simultaneous calls', async () => {
    const [a, b] = await Promise.all([loadCatalog(1), loadCatalog(1)]);
    expect(a).toEqual(okData);
    expect(b).toEqual(okData);
    expect(inboxes.getWhatsappCatalog).toHaveBeenCalledTimes(1);
  });

  it('serves from memory until it expires', async () => {
    await loadCatalog(1);
    await loadCatalog(1);
    expect(inboxes.getWhatsappCatalog).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(CATALOG_CACHE_TTL + 1);
    await loadCatalog(1);
    expect(inboxes.getWhatsappCatalog).toHaveBeenCalledTimes(2);
  });

  it('caches per inbox', async () => {
    await loadCatalog(1);
    await loadCatalog(2);
    expect(inboxes.getWhatsappCatalog).toHaveBeenCalledTimes(2);
  });

  it('force skips the cache and asks for refresh', async () => {
    await loadCatalog(1);
    await loadCatalog(1, { force: true });
    expect(inboxes.getWhatsappCatalog).toHaveBeenLastCalledWith(1, {
      refresh: true,
    });
  });

  it('does not cache non-ok statuses', async () => {
    inboxes.getWhatsappCatalog.mockResolvedValue({
      data: { status: 'error' },
    });
    await loadCatalog(1);
    await loadCatalog(1);
    expect(inboxes.getWhatsappCatalog).toHaveBeenCalledTimes(2);
  });

  it('does not cache request failures and propagates them', async () => {
    inboxes.getWhatsappCatalog.mockRejectedValueOnce(new Error('boom'));
    await expect(loadCatalog(1)).rejects.toThrow('boom');
    await expect(loadCatalog(1)).resolves.toEqual(okData);
    expect(inboxes.getWhatsappCatalog).toHaveBeenCalledTimes(2);
  });

  it('prefetch swallows errors', async () => {
    inboxes.getWhatsappCatalog.mockRejectedValueOnce(new Error('boom'));
    await expect(prefetchCatalog(1)).resolves.toBeUndefined();
  });
});
