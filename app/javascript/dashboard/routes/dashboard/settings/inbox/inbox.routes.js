import { FEATURE_FLAGS } from '../../../../featureFlags';
import { frontendURL } from '../../../../helper/URLHelper';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/inboxes'),
      component: () => import('../SettingsWrapper.vue'),
      children: [
        {
          path: '',
          redirect: to => {
            return { name: 'settings_inbox_list', params: to.params };
          },
        },
        {
          path: 'list',
          name: 'settings_inbox_list',
          component: () => import('./Index.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.INBOX_MANAGEMENT,
            permissions: ['administrator'],
          },
        },
      ],
    },
    {
      path: frontendURL('accounts/:accountId/settings/inboxes'),
      component: () => import('../Wrapper.vue'),
      props: params => {
        const showBackButton = params.name !== 'settings_inbox_list';
        const fullWidth = params.name === 'settings_inbox_show';
        return {
          headerTitle: 'INBOX_MGMT.HEADER',
          icon: 'mail-inbox-all',
          showBackButton,
          fullWidth,
        };
      },
      children: [
        {
          path: 'new',
          component: () => import('./InboxChannels.vue'),
          children: [
            {
              path: '',
              name: 'settings_inbox_new',
              component: () => import('./ChannelList.vue'),
              meta: {
                featureFlag: FEATURE_FLAGS.INBOX_MANAGEMENT,
                permissions: ['administrator'],
              },
            },
            {
              path: ':inbox_id/finish',
              name: 'settings_inbox_finish',
              component: () => import('./FinishSetup.vue'),
              meta: {
                featureFlag: FEATURE_FLAGS.INBOX_MANAGEMENT,
                permissions: ['administrator'],
              },
            },
            {
              path: ':sub_page',
              name: 'settings_inboxes_page_channel',
              component: () => import('./ChannelFactory.vue'),
              meta: {
                featureFlag: FEATURE_FLAGS.INBOX_MANAGEMENT,
                permissions: ['administrator'],
              },
              props: route => {
                return { channelName: route.params.sub_page };
              },
            },
            {
              path: ':inbox_id/agents',
              name: 'settings_inboxes_add_agents',
              meta: {
                featureFlag: FEATURE_FLAGS.INBOX_MANAGEMENT,
                permissions: ['administrator'],
              },
              component: () => import('./AddAgents.vue'),
            },
          ],
        },
        {
          path: ':inboxId/:tab?',
          name: 'settings_inbox_show',
          component: () => import('./Settings.vue'),
          meta: {
            featureFlag: FEATURE_FLAGS.INBOX_MANAGEMENT,
            permissions: ['administrator'],
          },
        },
      ],
    },
  ],
};
