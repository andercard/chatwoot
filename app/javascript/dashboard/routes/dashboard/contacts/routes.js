import { frontendURL } from '../../../helper/URLHelper';
import { FEATURE_FLAGS } from '../../../featureFlags';

const commonMeta = {
  featureFlag: FEATURE_FLAGS.CRM,
  permissions: ['administrator', 'agent', 'contact_manage'],
};

export const routes = [
  {
    path: frontendURL('accounts/:accountId/contacts'),
    component: () => import('./pages/ContactsIndex.vue'),
    meta: commonMeta,
    children: [
      {
        path: '',
        name: 'contacts_dashboard_index',
        component: () => import('./pages/ContactsIndex.vue'),
        meta: commonMeta,
      },
      {
        path: 'segments/:segmentId',
        name: 'contacts_dashboard_segments_index',
        component: () => import('./pages/ContactsIndex.vue'),
        meta: commonMeta,
      },
      {
        path: 'labels/:label',
        name: 'contacts_dashboard_labels_index',
        component: () => import('./pages/ContactsIndex.vue'),
        meta: commonMeta,
      },
      {
        path: 'active',
        name: 'contacts_dashboard_active',
        component: () => import('./pages/ContactsIndex.vue'),
        meta: commonMeta,
      },
    ],
  },
  {
    path: frontendURL('accounts/:accountId/contacts/:contactId'),
    component: () => import('./pages/ContactManageView.vue'),
    meta: commonMeta,
    children: [
      {
        path: '',
        name: 'contacts_edit',
        component: () => import('./pages/ContactManageView.vue'),
        meta: commonMeta,
      },
      {
        path: 'segments/:segmentId',
        name: 'contacts_edit_segment',
        component: () => import('./pages/ContactManageView.vue'),
        meta: commonMeta,
      },
      {
        path: 'labels/:label',
        name: 'contacts_edit_label',
        component: () => import('./pages/ContactManageView.vue'),
        meta: commonMeta,
      },
    ],
  },
];
