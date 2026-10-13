import { FEATURE_FLAGS } from '../../../../featureFlags';
import { frontendURL } from '../../../../helper/URLHelper';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/assignment-policy'),
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: '',
          redirect: to => {
            return { name: 'assignment_policy_index', params: to.params };
          },
        },
        {
          path: 'index',
          name: 'assignment_policy_index',
          component: () => import('./Index.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.ASSIGNMENT_V2,
            permissions: ['administrator'],
          },
        },
        {
          path: 'assignment',
          name: 'agent_assignment_policy_index',
          component: () => import('./pages/AgentAssignmentIndexPage.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.ASSIGNMENT_V2,
            permissions: ['administrator'],
          },
        },
        {
          path: 'assignment/create',
          name: 'agent_assignment_policy_create',
          component: () => import('./pages/AgentAssignmentCreatePage.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.ASSIGNMENT_V2,
            permissions: ['administrator'],
          },
        },
        {
          path: 'assignment/edit/:id',
          name: 'agent_assignment_policy_edit',
          component: () => import('./pages/AgentAssignmentEditPage.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.ASSIGNMENT_V2,
            permissions: ['administrator'],
          },
        },
        {
          path: 'capacity',
          name: 'agent_capacity_policy_index',
          component: () => import('./pages/AgentCapacityIndexPage.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.ADVANCED_ASSIGNMENT,
            permissions: ['administrator'],
          },
        },
        {
          path: 'capacity/create',
          name: 'agent_capacity_policy_create',
          component: () => import('./pages/AgentCapacityCreatePage.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.ADVANCED_ASSIGNMENT,
            permissions: ['administrator'],
          },
        },
        {
          path: 'capacity/edit/:id',
          name: 'agent_capacity_policy_edit',
          component: () => import('./pages/AgentCapacityEditPage.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.ADVANCED_ASSIGNMENT,
            permissions: ['administrator'],
          },
        },
      ],
    },
  ],
};
