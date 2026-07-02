import type { AppDefinition } from "@w6w/types";
import personalAccessToken from "./auth/personal-access-token.ts";
import oauth2 from "./auth/oauth2.ts";
import apiKey from "./auth/api-key.ts";
import createRecord from "./actions/create-record.ts";
import appendRecords from "./actions/append-records.ts";
import getRecord from "./actions/get-record.ts";
import searchRecords from "./actions/search-records.ts";
import updateRecord from "./actions/update-record.ts";
import upsertRecords from "./actions/upsert-records.ts";
import deleteRecord from "./actions/delete-record.ts";
import listBases from "./actions/list-bases.ts";
import getBaseSchema from "./actions/get-base-schema.ts";
import getTable from "./actions/get-table.ts";

export default {
  actions: [
    // record
    createRecord,
    appendRecords,
    getRecord,
    searchRecords,
    updateRecord,
    upsertRecords,
    deleteRecord,
    // base
    listBases,
    getBaseSchema,
    // table
    getTable,
  ],
  // Recommended order: PAT first (Feb 2024+ default), OAuth for public integrations,
  // legacy API key last (deprecated).
  auth: [personalAccessToken, oauth2, apiKey],
} satisfies AppDefinition;
