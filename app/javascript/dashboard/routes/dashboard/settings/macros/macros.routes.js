import { FEATURE_FLAGS } from '../../../../featureFlags';
import { frontendURL } from 'dashboard/helper/URLHelper';

import {
  ROLES,
  CONVERSATION_PERMISSIONS,
} from 'dashboard/constants/permissions.js';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/macros'),
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: '',
          name: 'macros_wrapper',
          component: () => import('./Index.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.MACROS,
            permissions: [...ROLES, ...CONVERSATION_PERMISSIONS],
          },
        },
      ],
    },
    {
      path: frontendURL('accounts/:accountId/settings/macros'),
      component: () => import('../Wrapper.vue'),
      props: () => {
        return {
          headerTitle: 'MACROS.HEADER',
          icon: 'flash-settings',
          showBackButton: true,
        };
      },
      children: [
        {
          path: ':macroId/edit',
          name: 'macros_edit',
          component: () => import('./MacroEditor.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.MACROS,
            permissions: [...ROLES, ...CONVERSATION_PERMISSIONS],
          },
        },
        {
          path: 'new',
          name: 'macros_new',
          component: () => import('./MacroEditor.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.MACROS,
            permissions: [...ROLES, ...CONVERSATION_PERMISSIONS],
          },
        },
      ],
    },
  ],
};
