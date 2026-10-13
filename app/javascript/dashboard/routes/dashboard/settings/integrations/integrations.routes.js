import { FEATURE_FLAGS } from '../../../../featureFlags';
import { frontendURL } from '../../../../helper/URLHelper';

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
            featureFlag: FEATURE_FLAGS.INTEGRATIONS,
            permissions: ['administrator'],
          },
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
