import { frontendURL } from 'dashboard/helper/URLHelper.js';

import { FEATURE_FLAGS } from 'dashboard/featureFlags';

const meta = {
  featureFlag: FEATURE_FLAGS.CAMPAIGNS,
  permissions: ['administrator'],
};

const campaignsRoutes = {
  routes: [
    {
      path: frontendURL('accounts/:accountId/campaigns'),
      component: () => import('./pages/CampaignsPageRouteView.vue'),
      children: [
        {
          path: '',
          redirect: to => {
            return { name: 'campaigns_ongoing_index', params: to.params };
          },
        },
        {
          path: 'ongoing',
          name: 'campaigns_ongoing_index',
          meta,
          redirect: to => {
            return { name: 'campaigns_livechat_index', params: to.params };
          },
        },
        {
          path: 'one_off',
          name: 'campaigns_one_off_index',
          meta,
          redirect: to => {
            return { name: 'campaigns_sms_index', params: to.params };
          },
        },
        {
          path: 'live_chat',
          name: 'campaigns_livechat_index',
          meta,
          component: () => import('./pages/LiveChatCampaignsPage.vue'),
        },
        {
          path: 'sms',
          name: 'campaigns_sms_index',
          meta,
          component: () => import('./pages/SMSCampaignsPage.vue'),
        },
        {
          path: 'whatsapp',
          name: 'campaigns_whatsapp_index',
          meta: {
            ...meta,
            featureFlag: FEATURE_FLAGS.WHATSAPP_CAMPAIGNS,
          },
          component: () => import('./pages/WhatsAppCampaignsPage.vue'),
        },
        {
          path: 'whatsapp/:campaignId/analytics',
          name: 'campaigns_whatsapp_analytics',
          meta: {
            ...meta,
            featureFlag: FEATURE_FLAGS.WHATSAPP_CAMPAIGNS,
          },
          component: () => import('./pages/WhatsAppCampaignAnalyticsPage.vue'),
        },
      ],
    },
  ],
};

export default campaignsRoutes;
