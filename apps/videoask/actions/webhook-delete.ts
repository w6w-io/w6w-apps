import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { formIdParam, organizationIdParam, webhookTagParam } from "../lib/params.ts";

/** `DELETE /forms/{form_id}/webhooks/{tag}` — remove a webhook. */
interface Input {
  formId: string;
  webhookTag: string;
  organizationId?: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook by its tag.",
  idempotent: true,
  params: [formIdParam, webhookTagParam, organizationIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new VideoAskClient(ctx).status(
      `/forms/${encodeId(input.formId)}/webhooks/${encodeId(input.webhookTag)}`,
      { method: "DELETE", organizationId: input.organizationId },
    );
    return { status };
  },
};

export default webhookDelete;
