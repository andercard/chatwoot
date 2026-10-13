import { FEATURE_FLAGS } from '../../../../featureFlags';
import { frontendURL } from '../../../../helper/URLHelper';
import {
  ROLES,
  CONVERSATION_PERMISSIONS,
} from 'dashboard/constants/permissions.js';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/canned-response'),
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: '',
          redirect: to => {
            return { name: 'canned_list', params: to.params };
          },
        },
        {
          path: 'list',
          name: 'canned_list',
          meta: {
            featureFlag: FEATURE_FLAGS.CANNED_RESPONSES,
            permissions: [...ROLES, ...CONVERSATION_PERMISSIONS],
          },
          component: () => import('./Index.vue'),
        },
      ],
    },
  ],
};
