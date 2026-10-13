import { FEATURE_FLAGS } from '../../../../featureFlags';
import { frontendURL } from '../../../../helper/URLHelper';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/data'),
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: '',
          name: 'settings_data_imports',
          component: () => import('./Index.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.DATA_IMPORT,
            permissions: ['administrator'],
          },
        },
        {
          path: ':dataImportId',
          name: 'settings_data_import_show',
          component: () => import('./Show.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.DATA_IMPORT,
            permissions: ['administrator'],
          },
        },
      ],
    },
  ],
};
