import { frontendURL } from '../../../helper/URLHelper';
import { FEATURE_FLAGS } from '../../../featureFlags';
import { INSTALLATION_TYPES } from 'dashboard/constants/installationTypes';

const commonMeta = {
  featureFlag: FEATURE_FLAGS.COMPANIES,
  permissions: ['administrator', 'agent'],
  installationTypes: [INSTALLATION_TYPES.CLOUD, INSTALLATION_TYPES.ENTERPRISE],
};

export const routes = [
  {
    path: frontendURL('accounts/:accountId/companies'),
    component: () => import('./pages/CompaniesIndex.vue'),
    meta: commonMeta,
    children: [
      {
        path: '',
        name: 'companies_dashboard_index',
        component: () => import('./pages/CompaniesIndex.vue'),
        meta: commonMeta,
      },
    ],
  },
  {
    path: frontendURL('accounts/:accountId/companies/:companyId'),
    component: () => import('./pages/CompanyDetailView.vue'),
    meta: commonMeta,
    children: [
      {
        path: '',
        name: 'companies_dashboard_show',
        component: () => import('./pages/CompanyDetailView.vue'),
        meta: commonMeta,
      },
    ],
  },
];
