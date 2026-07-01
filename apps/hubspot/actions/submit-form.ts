import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient } from "../lib/client.ts";

interface Input {
  portalId: string;
  formId: string;
  fields: Array<{ name: string; value: string; objectTypeId?: string }>;
  context?: Record<string, unknown>;
  legalConsentOptions?: Record<string, unknown>;
  skipValidation?: boolean;
  submittedAt?: number;
}

/**
 * Submits a Forms API submission to the public forms submission endpoint.
 * Note: this endpoint is unauthenticated in HubSpot's model — it's driven by
 * the (portalId, formId) pair — but we still route it through the client so
 * the request goes through the runtime's network policy.
 */
const submitForm: ActionDefinition<Input> = {
  key: "submit-form",
  type: "perform",
  resource: "form",
  title: "Submit Form",
  description: "Submit a HubSpot form as if a visitor filled it in.",
  params: [
    { key: "portalId", label: "Portal ID", type: "string", required: true },
    { key: "formId", label: "Form ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: "Array of `{ name, value, objectTypeId? }` entries.",
    },
    { key: "context", label: "Context", type: "json" },
    { key: "legalConsentOptions", label: "Legal consent", type: "json" },
    { key: "skipValidation", label: "Skip validation", type: "boolean", default: false },
    { key: "submittedAt", label: "Submitted at (ms)", type: "number" },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    return client.request(
      `https://api.hsforms.com/submissions/v3/integration/submit/${input.portalId}/${input.formId}`,
      {
        method: "POST",
        body: {
          fields: input.fields,
          ...(input.context ? { context: input.context } : {}),
          ...(input.legalConsentOptions ? { legalConsentOptions: input.legalConsentOptions } : {}),
          ...(input.skipValidation !== undefined ? { skipValidation: input.skipValidation } : {}),
          ...(input.submittedAt !== undefined ? { submittedAt: input.submittedAt } : {}),
        },
      },
    );
  },
};

export default submitForm;
