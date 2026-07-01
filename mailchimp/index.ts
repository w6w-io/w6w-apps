import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import oauth2 from "./auth/oauth2.ts";

import createMember from "./actions/create-member.ts";
import deleteMember from "./actions/delete-member.ts";
import getMember from "./actions/get-member.ts";
import listMembers from "./actions/list-members.ts";
import updateMember from "./actions/update-member.ts";

import createMemberTag from "./actions/create-member-tag.ts";
import deleteMemberTag from "./actions/delete-member-tag.ts";

import listGroupInterests from "./actions/list-group-interests.ts";

import listCampaigns from "./actions/list-campaigns.ts";
import getCampaign from "./actions/get-campaign.ts";
import deleteCampaign from "./actions/delete-campaign.ts";
import sendCampaign from "./actions/send-campaign.ts";
import replicateCampaign from "./actions/replicate-campaign.ts";
import resendCampaign from "./actions/resend-campaign.ts";

export default {
  actions: [
    createMember,
    deleteMember,
    getMember,
    listMembers,
    updateMember,
    createMemberTag,
    deleteMemberTag,
    listGroupInterests,
    listCampaigns,
    getCampaign,
    deleteCampaign,
    sendCampaign,
    replicateCampaign,
    resendCampaign,
  ],
  auth: [apiKey, oauth2],
} satisfies AppDefinition;
