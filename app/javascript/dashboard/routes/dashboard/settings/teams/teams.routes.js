import { frontendURL } from '../../../../helper/URLHelper';
import { FEATURE_FLAGS } from '../../../../featureFlags';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/teams'),
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: '',
          redirect: to => {
            return { name: 'settings_teams_list', params: to.params };
          },
        },
        {
          path: 'list',
          name: 'settings_teams_list',
          component: () => import('./Index.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.TEAM_MANAGEMENT,
            permissions: ['administrator'],
          },
        },
      ],
    },
    {
      path: frontendURL('accounts/:accountId/settings/teams'),
      component: () => import('../Wrapper.vue'),
      props: () => {
        return {
          headerTitle: 'TEAMS_SETTINGS.HEADER',
          icon: 'people-team',
          showBackButton: true,
        };
      },
      children: [
        {
          path: 'new',
          component: () => import('./Create/Index.vue'),
          children: [
            {
              path: '',
              name: 'settings_teams_new',
              component: () => import('./Create/CreateTeam.vue'),
              meta: {
                featureFlag: FEATURE_FLAGS.TEAM_MANAGEMENT,
                permissions: ['administrator'],
              },
            },
            {
              path: ':teamId/finish',
              name: 'settings_teams_finish',
              component: () => import('./FinishSetup.vue'),
              meta: {
                featureFlag: FEATURE_FLAGS.TEAM_MANAGEMENT,
                permissions: ['administrator'],
              },
            },
            {
              path: ':teamId/agents',
              name: 'settings_teams_add_agents',
              meta: {
                featureFlag: FEATURE_FLAGS.TEAM_MANAGEMENT,
                permissions: ['administrator'],
              },
              component: () => import('./Create/AddAgents.vue'),
            },
          ],
        },
        {
          path: ':teamId/edit',
          component: () => import('./Edit/Index.vue'),
          children: [
            {
              path: '',
              name: 'settings_teams_edit',
              component: () => import('./Edit/EditTeam.vue'),
              meta: {
                featureFlag: FEATURE_FLAGS.TEAM_MANAGEMENT,
                permissions: ['administrator'],
              },
            },
            {
              path: 'agents',
              name: 'settings_teams_edit_members',
              component: () => import('./Edit/EditAgents.vue'),
              meta: {
                featureFlag: FEATURE_FLAGS.TEAM_MANAGEMENT,
                permissions: ['administrator'],
              },
            },
            {
              path: 'finish',
              name: 'settings_teams_edit_finish',
              meta: {
                featureFlag: FEATURE_FLAGS.TEAM_MANAGEMENT,
                permissions: ['administrator'],
              },
              component: () => import('./FinishSetup.vue'),
            },
          ],
        },
      ],
    },
  ],
};
