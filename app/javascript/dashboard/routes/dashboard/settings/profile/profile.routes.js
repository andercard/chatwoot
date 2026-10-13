import { frontendURL } from '../../../../helper/URLHelper';
import { parseBoolean } from '@chatwoot/utils';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/profile'),
      name: 'profile_settings',
      meta: {
        permissions: ['administrator', 'agent', 'custom_role'],
      },
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: 'settings',
          name: 'profile_settings_index',
          component: () => import('./Index.vue'),
          meta: {
            permissions: ['administrator', 'agent', 'custom_role'],
          },
        },
        {
          path: 'mfa',
          name: 'profile_settings_mfa',
          component: () => import('./MfaSettings.vue'),
          meta: {
            permissions: ['administrator', 'agent', 'custom_role'],
          },
          beforeEnter: (to, from, next) => {
            // Check if MFA is enabled globally
            if (!parseBoolean(window.chatwootConfig?.isMfaEnabled)) {
              // Redirect to profile settings if MFA is disabled
              next({ name: 'profile_settings_index' });
            } else {
              next();
            }
          },
        },
      ],
    },
  ],
};
