import { frontendURL } from '../../../../helper/URLHelper';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/templates'),
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: '',
          name: 'settings_templates',
          component: () => import('./Index.vue'),
          meta: {
            permissions: ['administrator'],
          },
        },
      ],
    },
  ],
};
