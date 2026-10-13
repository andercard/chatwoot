import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import { INSTALLATION_TYPES } from 'dashboard/constants/installationTypes';
import {
  CONVERSATION_PERMISSIONS,
  ROLES,
} from 'dashboard/constants/permissions';
import { frontendURL } from '../../../helper/URLHelper';

const meta = {
  permissions: ['administrator', 'agent'],
  featureFlag: FEATURE_FLAGS.CAPTAIN,
  installationTypes: [INSTALLATION_TYPES.CLOUD, INSTALLATION_TYPES.ENTERPRISE],
};

const faqSuggestionsMeta = {
  ...meta,
  permissions: [...ROLES, ...CONVERSATION_PERMISSIONS],
};

const metaCustomTools = {
  permissions: ['administrator', 'agent'],
  featureFlag: FEATURE_FLAGS.CAPTAIN_CUSTOM_TOOLS,
  installationTypes: [INSTALLATION_TYPES.CLOUD, INSTALLATION_TYPES.ENTERPRISE],
};

const metaV2 = {
  permissions: ['administrator', 'agent'],
  featureFlag: FEATURE_FLAGS.CAPTAIN_V2,
  installationTypes: [INSTALLATION_TYPES.CLOUD, INSTALLATION_TYPES.ENTERPRISE],
};

const assistantRoutes = [
  {
    path: frontendURL('accounts/:accountId/captain/:assistantId/overview'),
    component: () => import('./assistants/overview/Index.vue'),
    name: 'captain_assistants_overview_index',
    meta,
  },
  {
    path: frontendURL('accounts/:accountId/captain/:assistantId/faqs'),
    component: () => import('./responses/Index.vue'),
    name: 'captain_assistants_responses_index',
    meta,
  },
  {
    path: frontendURL('accounts/:accountId/captain/:assistantId/documents'),
    component: () => import('./documents/Index.vue'),
    name: 'captain_assistants_documents_index',
    meta,
  },
  {
    path: frontendURL('accounts/:accountId/captain/:assistantId/tools'),
    component: () => import('./tools/Index.vue'),
    name: 'captain_tools_index',
    meta: metaCustomTools,
  },
  {
    path: frontendURL('accounts/:accountId/captain/:assistantId/scenarios'),
    component: () => import('./assistants/scenarios/Index.vue'),
    name: 'captain_assistants_scenarios_index',
    meta: metaV2,
  },
  {
    path: frontendURL('accounts/:accountId/captain/:assistantId/playground'),
    component: () => import('./assistants/playground/Index.vue'),
    name: 'captain_assistants_playground_index',
    meta,
  },
  {
    path: frontendURL('accounts/:accountId/captain/:assistantId/inboxes'),
    component: () => import('./assistants/inboxes/Index.vue'),
    name: 'captain_assistants_inboxes_index',
    meta,
  },
  {
    path: frontendURL(
      'accounts/:accountId/captain/:assistantId/faqs/suggestions'
    ),
    component: () => import('./responses/FaqSuggestions.vue'),
    name: 'captain_assistants_faq_suggestions',
    meta: faqSuggestionsMeta,
  },
  {
    path: frontendURL('accounts/:accountId/captain/:assistantId/faqs/pending'),
    redirect: to => ({
      name: 'captain_assistants_faq_suggestions',
      params: to.params,
      query: to.query,
    }),
  },
  {
    path: frontendURL('accounts/:accountId/captain/:assistantId/settings'),
    component: () => import('./assistants/settings/Index.vue'),
    name: 'captain_assistants_settings_index',
    meta,
  },
  // Settings sub-pages
  {
    path: frontendURL(
      'accounts/:accountId/captain/:assistantId/settings/system'
    ),
    component: () => import('./assistants/settings/System.vue'),
    name: 'captain_assistants_settings_system_index',
    meta,
  },
  {
    path: frontendURL(
      'accounts/:accountId/captain/:assistantId/settings/audience'
    ),
    component: () => import('./assistants/settings/Audience.vue'),
    name: 'captain_assistants_settings_audience_index',
    meta,
  },
  {
    path: frontendURL(
      'accounts/:accountId/captain/:assistantId/settings/schedule'
    ),
    component: () => import('./assistants/settings/Schedule.vue'),
    name: 'captain_assistants_settings_schedule_index',
    meta,
  },
  {
    path: frontendURL(
      'accounts/:accountId/captain/:assistantId/settings/guardrails'
    ),
    component: () => import('./assistants/guardrails/Index.vue'),
    name: 'captain_assistants_guardrails_index',
    meta: metaV2,
  },
  {
    path: frontendURL(
      'accounts/:accountId/captain/:assistantId/settings/guidelines'
    ),
    component: () => import('./assistants/guidelines/Index.vue'),
    name: 'captain_assistants_guidelines_index',
    meta: metaV2,
  },
  {
    path: frontendURL('accounts/:accountId/captain/assistants'),
    component: () => import('./assistants/Index.vue'),
    name: 'captain_assistants_create_index',
    meta: {
      permissions: ['administrator', 'agent'],
      installationTypes: [
        INSTALLATION_TYPES.CLOUD,
        INSTALLATION_TYPES.ENTERPRISE,
      ],
    },
  },
  {
    path: frontendURL('accounts/:accountId/captain/:navigationPath'),
    component: () => import('./pages/AssistantsIndexPage.vue'),
    name: 'captain_assistants_index',
    meta,
  },
];

export const routes = [
  {
    path: frontendURL('accounts/:accountId/captain'),
    component: () => import('./pages/CaptainPageRouteView.vue'),
    redirect: to => {
      return {
        name: 'captain_assistants_index',
        params: {
          navigationPath: 'captain_assistants_overview_index',
          ...to.params,
        },
      };
    },
    children: [...assistantRoutes],
  },
];
