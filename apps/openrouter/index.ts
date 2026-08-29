import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import chatCompletion from "./actions/chat-completion.ts";
import embeddings from "./actions/embeddings.ts";
import listModels from "./actions/list-models.ts";
import getGeneration from "./actions/get-generation.ts";
import getKeyInfo from "./actions/get-key-info.ts";
import getCredits from "./actions/get-credits.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    chatCompletion,
    embeddings,
    listModels,
    getGeneration,
    getKeyInfo,
    getCredits,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
