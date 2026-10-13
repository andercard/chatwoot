import { frontendURL } from '../../../../helper/URLHelper';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/conversation-workflow'),
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: '',
          name: 'conversation_workflow_index',
          component: () => import('./index.vue'),
          meta: {
            permissions: ['administrator'],
          },
        },
      ],
    },
  ],
};
