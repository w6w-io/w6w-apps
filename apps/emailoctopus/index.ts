import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listLists from "./actions/list-lists.ts";
import getList from "./actions/get-list.ts";
import createList from "./actions/create-list.ts";
import updateList from "./actions/update-list.ts";
import deleteList from "./actions/delete-list.ts";

import listContacts from "./actions/list-contacts.ts";
import getContact from "./actions/get-contact.ts";
import createContact from "./actions/create-contact.ts";
import upsertContact from "./actions/upsert-contact.ts";
import updateContact from "./actions/update-contact.ts";
import deleteContact from "./actions/delete-contact.ts";
import updateContactsBatch from "./actions/update-contacts-batch.ts";

import createField from "./actions/create-field.ts";
import updateField from "./actions/update-field.ts";
import deleteField from "./actions/delete-field.ts";

import listTags from "./actions/list-tags.ts";
import createTag from "./actions/create-tag.ts";
import updateTag from "./actions/update-tag.ts";
import deleteTag from "./actions/delete-tag.ts";

import listCampaigns from "./actions/list-campaigns.ts";
import getCampaign from "./actions/get-campaign.ts";
import listCampaignReports from "./actions/list-campaign-reports.ts";
import getCampaignLinksReport from "./actions/get-campaign-links-report.ts";
import getCampaignSummaryReport from "./actions/get-campaign-summary-report.ts";

import startAutomation from "./actions/start-automation.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * EmailOctopus — one action per operation in the v2 OpenAPI document, which
 * publishes 25 across six tags (List, Contact, Field, Tag, Campaign,
 * Automation). Nothing here is invented: there is no send-campaign action
 * because the v2 API has no campaign write endpoint, and no list-automations
 * action because it has no automation read endpoint.
 */
export default {
  actions: [
    // List
    listLists,
    getList,
    createList,
    updateList,
    deleteList,
    // Contact
    listContacts,
    getContact,
    createContact,
    upsertContact,
    updateContact,
    deleteContact,
    updateContactsBatch,
    // Field
    createField,
    updateField,
    deleteField,
    // Tag
    listTags,
    createTag,
    updateTag,
    deleteTag,
    // Campaign (read-only — v2 publishes no campaign write endpoint)
    listCampaigns,
    getCampaign,
    listCampaignReports,
    getCampaignLinksReport,
    getCampaignSummaryReport,
    // Automation
    startAutomation,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
