import { FEATURE_FLAGS } from '../../../../featureFlags';
import { INSTALLATION_TYPES } from 'dashboard/constants/installationTypes';
import { frontendURL } from '../../../../helper/URLHelper';

const meta = {
  featureFlag: FEATURE_FLAGS.SLA,
  permissions: ['administrator'],
  installationTypes: [INSTALLATION_TYPES.CLOUD, INSTALLATION_TYPES.ENTERPRISE],
};

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/sla'),
      component: () => import('../SettingsWrapper.vue'),
      props: {},
      children: [
        {
          path: '',
          name: 'sla_wrapper',
          meta,
          redirect: to => {
            return { name: 'sla_list', params: to.params };
          },
        },
        {
          path: 'list',
          name: 'sla_list',
          meta,
          component: () => import('./Index.vue'),
        },
      ],
    },
  ],
};
