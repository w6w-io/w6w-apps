import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { formIdParam, organizationIdParam, webhookTagParam } from "../lib/params.ts";

/** `GET /forms/{form_id}/webhooks/{tag}` — a single webhook by its tag. */
interface Input {
  formId: string;
  webhookTag: string;
  organizationId?: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Fetch a single webhook by its tag.",
  params: [formIdParam, webhookTagParam, organizationIdParam],
  output: [{ key: "result", type: "object", label: "The webhook" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity(
      `/forms/${encodeId(input.formId)}/webhooks/${encodeId(input.webhookTag)}`,
      { organizationId: input.organizationId },
    );
    return { result };
  },
};

export default webhookGet;
