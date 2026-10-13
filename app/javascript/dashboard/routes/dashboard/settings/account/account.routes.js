import { frontendURL } from '../../../../helper/URLHelper';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/general'),
      meta: {
        permissions: ['administrator'],
      },
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: '',
          name: 'general_settings_index',
          component: () => import('./Index.vue'),
          meta: {
            permissions: ['administrator'],
          },
        },
      ],
    },
  ],
};
