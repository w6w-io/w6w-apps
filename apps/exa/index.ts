import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import search from "./actions/search.ts";
import findSimilar from "./actions/find-similar.ts";
import getContents from "./actions/get-contents.ts";
import answer from "./actions/answer.ts";
import createWebset from "./actions/create-webset.ts";
import getWebset from "./actions/get-webset.ts";
import listWebsets from "./actions/list-websets.ts";
import deleteWebset from "./actions/delete-webset.ts";
import listWebsetItems from "./actions/list-webset-items.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import credits from "./health/credits.ts";

export default {
  actions: [
    search,
    findSimilar,
    getContents,
    answer,
    createWebset,
    getWebset,
    listWebsets,
    deleteWebset,
    listWebsetItems,
  ],
  auth: [apiKey],
  healthChecks: [service, quota, credits],
} satisfies AppDefinition;
