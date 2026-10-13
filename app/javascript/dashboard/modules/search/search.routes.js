import { frontendURL } from '../../helper/URLHelper';
import {
  ROLES,
  CONVERSATION_PERMISSIONS,
  CONTACT_PERMISSIONS,
  PORTAL_PERMISSIONS,
} from 'dashboard/constants/permissions.js';

export const routes = [
  {
    path: frontendURL('accounts/:accountId/search/:tab?'),
    name: 'search',
    meta: {
      permissions: [
        ...ROLES,
        ...CONVERSATION_PERMISSIONS,
        CONTACT_PERMISSIONS,
        PORTAL_PERMISSIONS,
      ],
    },
    component: () => import('./components/SearchView.vue'),
  },
];
