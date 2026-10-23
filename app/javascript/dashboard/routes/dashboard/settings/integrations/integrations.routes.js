import { FEATURE_FLAGS } from '../../../../featureFlags';
import { frontendURL } from '../../../../helper/URLHelper';
import store from 'dashboard/store';

export const redirectShopifyIfUnavailable = async (to, _from, next) => {
  const accountId = Number(to.params.accountId);
  const account = store.getters['accounts/getAccount'](accountId);
  if (!account.id) {
    await store.dispatch('accounts/get', { accountId, silent: true });
  }

  const isShopifyEnabled = store.getters['accounts/isFeatureEnabledonAccount'](
    accountId,
    FEATURE_FLAGS.SHOPIFY
  );

  next(
    isShopifyEnabled
      ? undefined
      : {
          name: 'settings_applications',
          params: { accountId: to.params.accountId },
        }
  );
};

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/integrations'),
      component: () => import('../SettingsWrapper.vue'),
      props: {},
      children: [
        {
          path: '',
          name: 'settings_applications',
          component: () => import('./Index.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.INTEGRATIONS,
            permissions: ['administrator'],
          },
        },
        {
          path: 'dashboard_apps',
          component: () => import('./DashboardApps/Index.vue'),
          name: 'settings_integrations_dashboard_apps',
          meta: {
            featureFlag: FEATURE_FLAGS.INTEGRATIONS,
            permissions: ['administrator'],
          },
        },
        {
          path: 'webhook',
          component: () => import('./Webhooks/Index.vue'),
          name: 'settings_integrations_webhook',
          meta: {
            featureFlag: FEATURE_FLAGS.INTEGRATIONS,
            permissions: ['administrator'],
          },
        },
      ],
    },
    {
      path: frontendURL('accounts/:accountId/settings/integrations'),
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: 'slack',
          name: 'settings_integrations_slack',
          component: () => import('./Slack.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.INTEGRATIONS,
            permissions: ['administrator'],
          },
          props: route => ({ code: route.query.code }),
        },
        {
          path: 'linear',
          name: 'settings_integrations_linear',
          component: () => import('./Linear.vue'),
          meta: {
            permissions: ['administrator'],
          },
          props: route => ({ code: route.query.code }),
        },
        {
          path: 'stripe',
          name: 'settings_integrations_stripe',
          component: () => import('./Stripe.vue'),
          meta: {
            permissions: ['administrator'],
          },
        },
        {
          path: 'google_translate',
          name: 'settings_integrations_google_translate',
          component: () => import('./GoogleTranslate.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.INTEGRATIONS,
            permissions: ['administrator'],
          },
        },
        {
          path: 'notion',
          name: 'settings_integrations_notion',
          component: () => import('./Notion.vue'),
          meta: {
            permissions: ['administrator'],
          },
          props: route => ({ code: route.query.code }),
        },
        {
          path: 'shopify',
          name: 'settings_integrations_shopify',
          component: () => import('./Shopify.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.SHOPIFY,
            permissions: ['administrator'],
          },
          beforeEnter: redirectShopifyIfUnavailable,
          props: route => ({ error: route.query.error }),
        },
        {
          path: ':integration_id',
          name: 'settings_applications_integration',
          component: () => import('./IntegrationHooks.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.INTEGRATIONS,
            permissions: ['administrator'],
          },
          props: route => ({
            integrationId: route.params.integration_id,
          }),
        },
      ],
    },
  ],
};
