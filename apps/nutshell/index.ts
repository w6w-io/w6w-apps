import type { AppDefinition } from "@w6w/types";

import getLead from "./actions/get-lead.ts";
import findLeads from "./actions/find-leads.ts";
import createLead from "./actions/create-lead.ts";
import updateLead from "./actions/update-lead.ts";

import getAccount from "./actions/get-account.ts";
import findAccounts from "./actions/find-accounts.ts";
import createAccount from "./actions/create-account.ts";
import updateAccount from "./actions/update-account.ts";

import getContact from "./actions/get-contact.ts";
import findContacts from "./actions/find-contacts.ts";
import createContact from "./actions/create-contact.ts";
import updateContact from "./actions/update-contact.ts";

import addNote from "./actions/add-note.ts";

import basic from "./auth/basic.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    getLead,
    findLeads,
    createLead,
    updateLead,
    getAccount,
    findAccounts,
    createAccount,
    updateAccount,
    getContact,
    findContacts,
    createContact,
    updateContact,
    addNote,
  ],
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
