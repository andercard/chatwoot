import { frontendURL } from 'dashboard/helper/URLHelper';
import {
  ROLES,
  CONVERSATION_PERMISSIONS,
} from 'dashboard/constants/permissions.js';

export const routes = [
  {
    path: frontendURL('accounts/:accountId/inbox-view'),
    component: () => import('./InboxList.vue'),
    children: [
      {
        path: '',
        name: 'inbox_view',
        component: () => import('./InboxEmptyState.vue'),
        meta: {
          permissions: [...ROLES, ...CONVERSATION_PERMISSIONS],
        },
      },
      {
        path: ':type/:id',
        name: 'inbox_view_conversation',
        component: () => import('./InboxView.vue'),
        meta: {
          permissions: [...ROLES, ...CONVERSATION_PERMISSIONS],
        },
      },
    ],
  },
];
