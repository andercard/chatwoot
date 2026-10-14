import inboxes from '../api/inboxes';

export const CATALOG_CACHE_TTL = 5 * 60 * 1000;

const cache = new Map();
const pending = new Map();

export const clearCatalogCache = () => {
  cache.clear();
  pending.clear();
};

export const loadCatalog = (inboxId, { force = false } = {}) => {
  const cached = cache.get(inboxId);
  if (!force && cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data);
  }
  if (!force && pending.has(inboxId)) return pending.get(inboxId);

  const request = inboxes
    .getWhatsappCatalog(inboxId, { refresh: force })
    .then(({ data }) => {
      if (data.status === 'ok') {
        cache.set(inboxId, {
          data,
          expiresAt: Date.now() + CATALOG_CACHE_TTL,
        });
      }
      return data;
    })
    .finally(() => {
      if (pending.get(inboxId) === request) pending.delete(inboxId);
    });
  pending.set(inboxId, request);
  return request;
};

export const prefetchCatalog = inboxId => loadCatalog(inboxId).catch(() => {});
