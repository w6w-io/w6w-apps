import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import getProfile from "./actions/get-profile.ts";
import getProfiles from "./actions/get-profiles.ts";
import createProfile from "./actions/create-profile.ts";
import updateProfile from "./actions/update-profile.ts";
import subscribeProfiles from "./actions/subscribe-profiles.ts";
import unsubscribeProfiles from "./actions/unsubscribe-profiles.ts";

import getList from "./actions/get-list.ts";
import getLists from "./actions/get-lists.ts";
import createList from "./actions/create-list.ts";
import deleteList from "./actions/delete-list.ts";
import addProfilesToList from "./actions/add-profiles-to-list.ts";
import removeProfilesFromList from "./actions/remove-profiles-from-list.ts";

import createEvent from "./actions/create-event.ts";
import getEvents from "./actions/get-events.ts";

import getSegments from "./actions/get-segments.ts";
import getSegment from "./actions/get-segment.ts";

import getCampaigns from "./actions/get-campaigns.ts";
import getCampaign from "./actions/get-campaign.ts";
import sendCampaign from "./actions/send-campaign.ts";

import getTemplates from "./actions/get-templates.ts";
import getTemplate from "./actions/get-template.ts";
import createTemplate from "./actions/create-template.ts";
import renderTemplate from "./actions/render-template.ts";

export default {
  actions: [
    getProfile,
    getProfiles,
    createProfile,
    updateProfile,
    subscribeProfiles,
    unsubscribeProfiles,
    getList,
    getLists,
    createList,
    deleteList,
    addProfilesToList,
    removeProfilesFromList,
    createEvent,
    getEvents,
    getSegments,
    getSegment,
    getCampaigns,
    getCampaign,
    sendCampaign,
    getTemplates,
    getTemplate,
    createTemplate,
    renderTemplate,
  ],
  auth: [apiKey],
} satisfies AppDefinition;
