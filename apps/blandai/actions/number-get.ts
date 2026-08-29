import type { ActionDefinition } from "@w6w/types";
import { BlandClient } from "../lib/client.ts";

/**
 * `GET /v1/inbound/{phone_number}` — settings for one inbound number.
 *
 * Verified against `docs.bland.ai/api-v1/get/inbound-number`. The `+` prefix
 * is optional per the vendor's own formatting notes; passed through as given.
 */
interface Input {
  phoneNumber: string;
}

const numberGet: ActionDefinition<Input> = {
  key: "number-get",
  type: "read",
  resource: "number",
  title: "Get Number",
  description: "Retrieve settings for a specific inbound phone number.",
  params: [
    {
      key: "phoneNumber",
      label: "Phone Number",
      type: "string",
      required: true,
      hint: "E.g. +13334445555. The + prefix is optional; a US country code is assumed if omitted.",
    },
  ],
  output: [
    { key: "phoneNumber", type: "string", label: "The inbound number" },
    { key: "prompt", type: "string", label: "The agent's prompt" },
    { key: "webhook", type: "string", label: "Post-call webhook URL" },
    { key: "pathwayId", type: "string", label: "Pathway used by this number" },
    { key: "maxDuration", type: "number", label: "Max call duration, in minutes" },
    { key: "fallbackNumber", type: "string", label: "Forwarding number during Bland maintenance" },
  ],

  async execute(input, ctx) {
    const number = await new BlandClient(ctx).request<Record<string, unknown>>(
      `/v1/inbound/${encodeURIComponent(input.phoneNumber)}`,
    );
    return {
      phoneNumber: number.phone_number,
      prompt: number.prompt,
      webhook: number.webhook,
      pathwayId: number.pathway_id,
      maxDuration: number.max_duration,
      fallbackNumber: number.fallback_number,
    };
  },
};

export default numberGet;
