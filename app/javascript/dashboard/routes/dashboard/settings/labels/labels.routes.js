import { FEATURE_FLAGS } from '../../../../featureFlags';
import { frontendURL } from '../../../../helper/URLHelper';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/labels'),
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: '',
          name: 'labels_wrapper',
          meta: {
            permissions: ['administrator'],
          },
          redirect: to => {
            return { name: 'labels_list', params: to.params };
          },
        },
        {
          path: 'list',
          name: 'labels_list',
          meta: {
            featureFlag: FEATURE_FLAGS.LABELS,
            permissions: ['administrator'],
          },
          component: () => import('./Index.vue'),
        },
      ],
    },
  ],
};
