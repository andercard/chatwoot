import { INSTALLATION_TYPES } from 'dashboard/constants/installationTypes';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import { frontendURL } from '../../../../helper/URLHelper';

const meta = {
  featureFlag: FEATURE_FLAGS.REPORTS,
  permissions: ['administrator', 'report_manage'],
};

const monitorsMeta = {
  ...meta,
  featureFlag: FEATURE_FLAGS.CONVERSATION_MONITORS,
  installationTypes: [INSTALLATION_TYPES.ENTERPRISE, INSTALLATION_TYPES.CLOUD],
};

const oldReportRoutes = [
  {
    path: 'agent',
    name: 'agent_reports',
    meta,
    component: () => import('./AgentReports.vue'),
  },
  {
    path: 'inboxes',
    name: 'inbox_reports',
    meta,
    component: () => import('./InboxReports.vue'),
  },
  {
    path: 'label',
    name: 'label_reports',
    meta,
    component: () => import('./LabelReports.vue'),
  },
  {
    path: 'teams',
    name: 'team_reports',
    meta,
    component: () => import('./TeamReports.vue'),
  },
];

const revisedReportRoutes = [
  {
    path: 'agents_overview',
    name: 'agent_reports_index',
    meta,
    component: () => import('./AgentReportsIndex.vue'),
  },
  {
    path: 'agents/:id',
    name: 'agent_reports_show',
    meta,
    component: () => import('./AgentReportsShow.vue'),
  },

  {
    path: 'inboxes_overview',
    name: 'inbox_reports_index',
    meta,
    component: () => import('./InboxReportsIndex.vue'),
  },
  {
    path: 'inboxes/:id',
    name: 'inbox_reports_show',
    meta,
    component: () => import('./InboxReportsShow.vue'),
  },
  {
    path: 'teams_overview',
    name: 'team_reports_index',
    meta,
    component: () => import('./TeamReportsIndex.vue'),
  },
  {
    path: 'teams/:id',
    name: 'team_reports_show',
    meta,
    component: () => import('./TeamReportsShow.vue'),
  },
  {
    path: 'labels_overview',
    name: 'label_reports_index',
    meta,
    component: () => import('./LabelReportsIndex.vue'),
  },
  {
    path: 'labels/:id',
    name: 'label_reports_show',
    meta,
    component: () => import('./LabelReportsShow.vue'),
  },
];

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/reports/monitors'),
      name: 'monitor_reports_index',
      meta: monitorsMeta,
      component: () => import('./monitors/MonitorsIndex.vue'),
    },
    {
      path: frontendURL('accounts/:accountId/reports'),
      component: () => import('./components/ReportsWrapper.vue'),
      children: [
        {
          path: 'monitors/:monitorId',
          name: 'monitor_reports_show',
          meta: monitorsMeta,
          component: () => import('./monitors/MonitorShow.vue'),
        },
        {
          path: '',
          redirect: to => {
            return { name: 'account_overview_reports', params: to.params };
          },
        },
        {
          path: 'overview',
          name: 'account_overview_reports',
          meta,
          component: () => import('./LiveReports.vue'),
        },
        {
          path: 'conversation',
          name: 'conversation_reports',
          meta,
          component: () => import('./Index.vue'),
        },
        ...oldReportRoutes,
        ...revisedReportRoutes,
        {
          path: 'sla',
          name: 'sla_reports',
          meta,
          component: () => import('./SLAReports.vue'),
        },
        {
          path: 'csat',
          name: 'csat_reports',
          meta,
          component: () => import('./CsatResponses.vue'),
        },
        {
          path: 'bot',
          name: 'bot_reports',
          meta,
          component: () => import('./BotReports.vue'),
        },
      ],
    },
  ],
};
