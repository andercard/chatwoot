import inboxes from '../api/inboxes';

export const CATALOG_CACHE_TTL = 5 * 60 * 1000;

const collectionsStore = { cache: new Map(), pending: new Map() };
const firstPageStore = { cache: new Map(), pending: new Map() };

export const clearCatalogCache = () => {
  [collectionsStore, firstPageStore].forEach(({ cache, pending }) => {
    cache.clear();
    pending.clear();
  });
};

// Serves `key` from memory while fresh, shares the in-flight request and
// stores only ok responses. `force` skips the cache and replaces it.
const cachedRequest = (key, fetcher, { cache, pending }, force = false) => {
  const cached = cache.get(key);
  if (!force && cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data);
  }
  if (!force && pending.has(key)) return pending.get(key);

  const request = fetcher()
    .then(({ data }) => {
      if (data.status === 'ok') {
        cache.set(key, { data, expiresAt: Date.now() + CATALOG_CACHE_TTL });
      }
      return data;
    })
    .finally(() => {
      if (pending.get(key) === request) pending.delete(key);
    });
  pending.set(key, request);
  return request;
};

export const loadCatalog = (inboxId, { force = false } = {}) =>
  cachedRequest(
    inboxId,
    () => inboxes.getWhatsappCatalog(inboxId, { refresh: force }),
    collectionsStore,
    force
  );

// Only the first page without search is cached (per inbox and collection).
// Pages with `after` or `q` always hit the API and do not share requests.
export const loadProductsPage = (
  inboxId,
  { after, q, collectionId, force = false } = {}
) => {
  const fetcher = () =>
    inboxes.getWhatsappCatalogProducts(inboxId, {
      after,
      q,
      collectionId,
      refresh: force,
    });
  if (after || q) return fetcher().then(({ data }) => data);

  return cachedRequest(
    `${inboxId}:${collectionId || 'all'}`,
    fetcher,
    firstPageStore,
    force
  );
};

export const prefetchCatalog = inboxId =>
  Promise.all([loadCatalog(inboxId), loadProductsPage(inboxId)]).catch(
    () => {}
  );
