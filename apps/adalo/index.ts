import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import listRecords from "./actions/list-records.ts";
import getRecord from "./actions/get-record.ts";
import createRecord from "./actions/create-record.ts";
import updateRecord from "./actions/update-record.ts";
import deleteRecord from "./actions/delete-record.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listRecords,
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
