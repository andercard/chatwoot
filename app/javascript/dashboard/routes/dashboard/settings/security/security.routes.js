import { frontendURL } from '../../../../helper/URLHelper';

// No SAML feature-flag or installation-type gate here: the page also hosts
// MFA enforcement, which self-hosted installs need. SAML gates itself in-page.
export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/security'),
      meta: {
        permissions: ['administrator'],
      },
      component: () => import('../SettingsWrapper.vue'),
      props: {
        headerTitle: 'SECURITY_SETTINGS.TITLE',
        icon: 'i-lucide-shield',
        showNewButton: false,
      },
      children: [
        {
          path: '',
          name: 'security_settings_index',
          component: () => import('./Index.vue'),
          meta: {
            permissions: ['administrator'],
          },
        },
      ],
    },
  ],
};
