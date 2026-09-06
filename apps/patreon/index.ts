import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import creatorAccessToken from "./auth/creator-access-token.ts";

// identity
import getIdentity from "./actions/get-identity.ts";

// campaign
import listCampaigns from "./actions/list-campaigns.ts";
import getCampaign from "./actions/get-campaign.ts";

// member
import listCampaignMembers from "./actions/list-campaign-members.ts";
import getMember from "./actions/get-member.ts";

// post
import listCampaignPosts from "./actions/list-campaign-posts.ts";
import getPost from "./actions/get-post.ts";

// webhook
import listWebhooks from "./actions/list-webhooks.ts";
import createWebhook from "./actions/create-webhook.ts";
import updateWebhook from "./actions/update-webhook.ts";
import deleteWebhook from "./actions/delete-webhook.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    getIdentity,
    listCampaigns,
    getCampaign,
    listCampaignMembers,
    getMember,
    listCampaignPosts,
    getPost,
    listWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
  ],
  auth: [oauth2, creatorAccessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
