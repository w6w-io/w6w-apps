import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import validateEmail from "./actions/validate-email.ts";
import validateBatch from "./actions/validate-batch.ts";
import getCredits from "./actions/get-credits.ts";
import getApiUsage from "./actions/get-api-usage.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    validateEmail,
    validateBatch,
    getCredits,
    getApiUsage,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
