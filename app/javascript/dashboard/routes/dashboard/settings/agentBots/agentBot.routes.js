import { FEATURE_FLAGS } from '../../../../featureFlags';
import { frontendURL } from '../../../../helper/URLHelper';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/agent-bots'),
      meta: {
        permissions: ['administrator'],
      },
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: '',
          name: 'agent_bots',
          component: () => import('./Index.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.AGENT_BOTS,
            permissions: ['administrator'],
          },
        },
      ],
    },
  ],
};
