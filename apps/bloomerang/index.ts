import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import searchConstituents from "./actions/search-constituents.ts";
import getConstituent from "./actions/get-constituent.ts";
import createConstituent from "./actions/create-constituent.ts";
import updateConstituent from "./actions/update-constituent.ts";

import listTransactions from "./actions/list-transactions.ts";
import getTransaction from "./actions/get-transaction.ts";
import createDonation from "./actions/create-donation.ts";

import listFunds from "./actions/list-funds.ts";

import createNote from "./actions/create-note.ts";
import createTask from "./actions/create-task.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Constituent — the donor/household/organization record everything else hangs off
    searchConstituents,
    getConstituent,
    createConstituent,
    updateConstituent,
    // Transaction — donations and other designations
    listTransactions,
    getTransaction,
    createDonation,
    // Fund — the id a donation's designation points at
    listFunds,
    // Timeline entries
    createNote,
    createTask,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
