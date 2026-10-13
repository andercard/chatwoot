import { FEATURE_FLAGS } from '../../../../featureFlags';
import { frontendURL } from '../../../../helper/URLHelper';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/custom-attributes'),
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: '',
          redirect: to => {
            return { name: 'attributes_list', params: to.params };
          },
        },
        {
          path: 'list',
          name: 'attributes_list',
          component: () => import('./Index.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.CUSTOM_ATTRIBUTES,
            permissions: ['administrator'],
          },
        },
      ],
    },
  ],
};
