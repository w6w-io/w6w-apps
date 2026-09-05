import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import chatComplete from "./actions/chat-complete.ts";
import fimComplete from "./actions/fim-complete.ts";
import listModels from "./actions/list-models.ts";
import getBalance from "./actions/get-balance.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    chatComplete,
    fimComplete,
    listModels,
    getBalance,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
