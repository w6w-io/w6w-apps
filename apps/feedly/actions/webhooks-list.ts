import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient } from "../lib/client.ts";

/**
 * `GET /v3/enterprise/triggers` — list configured webhooks.
 *
 * Verified against the "Get the List of Webhooks" reference page (fetched
 * 2026-09-06): `servers: ["https://api.feedly.com/v3/enterprise"]`, path
 * `/triggers`. That page documents the response shape in full prose (the
 * OpenAPI block itself is an unhelpful empty-object stub) — an array of
 * `{id, type, webhookURL, hasAuthorization, lastSuccessTimestamp,
 * lastResponseCode, disabled, errorCount, lastErrorTimestamp,
 * lastErrorMessage, templateId?}`. Per that page: "The actual header value is
 * not returned" for `hasAuthorization` — this app never sees or stores a
 * configured webhook's authorization secret.
 */

const webhooksList: ActionDefinition<Record<string, never>> = {
  key: "webhooks-list",
  type: "read",
  resource: "webhooks",
  title: "List Webhooks",
  description: "List configured webhooks (NewEntrySaved, NewAnnotation, NewEntryPrioritized).",
  params: [],
  output: [{ key: "webhooks", type: "array", label: "Webhooks" }],

  async execute(_input, ctx) {
    const webhooks = await new FeedlyClient(ctx).json<unknown[]>("/v3/enterprise/triggers");
    return { webhooks: webhooks ?? [] };
  },
};

export default webhooksList;
