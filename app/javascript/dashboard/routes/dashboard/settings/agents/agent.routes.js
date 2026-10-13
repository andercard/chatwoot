import { FEATURE_FLAGS } from '../../../../featureFlags';
import { frontendURL } from '../../../../helper/URLHelper';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/agents'),
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: '',
          redirect: to => {
            return { name: 'agent_list', params: to.params };
          },
        },
        {
          path: 'list',
          name: 'agent_list',
          component: () => import('./Index.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.AGENT_MANAGEMENT,
            permissions: ['administrator'],
          },
        },
      ],
    },
  ],
};
