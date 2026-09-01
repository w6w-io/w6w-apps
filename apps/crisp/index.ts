import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import getWebsite from "./actions/get-website.ts";

import listConversations from "./actions/list-conversations.ts";
import getConversation from "./actions/get-conversation.ts";
import createConversation from "./actions/create-conversation.ts";
import updateConversationState from "./actions/update-conversation-state.ts";
import updateConversationMeta from "./actions/update-conversation-meta.ts";

import listMessages from "./actions/list-messages.ts";
import sendMessage from "./actions/send-message.ts";

import listPeople from "./actions/list-people.ts";
import getPeopleProfile from "./actions/get-people-profile.ts";
import createPeopleProfile from "./actions/create-people-profile.ts";
import updatePeopleProfile from "./actions/update-people-profile.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Website
    getWebsite,
    // Conversation
    listConversations,
    getConversation,
    createConversation,
    updateConversationState,
    updateConversationMeta,
    // Message
    listMessages,
    sendMessage,
    // People
    listPeople,
    getPeopleProfile,
    createPeopleProfile,
    updatePeopleProfile,
  ],
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
