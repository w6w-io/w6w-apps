import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, toList, VideoAskClient } from "../lib/client.ts";
import { formIdParam, organizationIdParam, webhookTagParam } from "../lib/params.ts";

/**
 * `PUT /forms/{form_id}/webhooks/{tag}` — "Create or update webhook". Body:
 * `{url, event_types, headers}` per the vendor's own example. `event_types`
 * documents exactly two values in the collection — `form_response` and
 * `form_response_transcribed` — so those are offered as options, though the
 * vendor does not claim the list is exhaustive.
 */
interface Input {
  formId: string;
  webhookTag: string;
  url: string;
  eventTypes: string[];
  headers?: unknown;
  organizationId?: string;
}

const webhookUpsert: ActionDefinition<Input> = {
  key: "webhook-upsert",
  type: "perform",
  resource: "webhook",
  title: "Create or Update Webhook",
  description:
    "Create a webhook (choose a new tag) or update an existing one (reuse its tag). Idempotent " +
    "by design — a PUT with the same body has no further effect.",
  idempotent: true,
  params: [
    formIdParam,
    webhookTagParam,
    { key: "url", label: "Target URL", type: "string", required: true },
    {
      key: "eventTypes",
      label: "Event types",
      type: "multiselect",
      required: true,
      options: [
        { value: "form_response", label: "Form response" },
        { value: "form_response_transcribed", label: "Form response, transcribed" },
      ],
    },
    {
      key: "headers",
      label: "Extra headers (JSON)",
      type: "json",
      hint: 'Custom headers sent with every delivery, e.g. {"secret": "open-sesame"}.',
    },
    organizationIdParam,
  ],
  output: [{ key: "result", type: "object", label: "The created/updated webhook" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity(
      `/forms/${encodeId(input.formId)}/webhooks/${encodeId(input.webhookTag)}`,
      {
        method: "PUT",
        body: compact({
          url: input.url,
          event_types: toList(input.eventTypes),
          headers: input.headers,
        }),
        organizationId: input.organizationId,
      },
    );
    return { result };
  },
};

export default webhookUpsert;
