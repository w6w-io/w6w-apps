import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { formIdParam, organizationIdParam } from "../lib/params.ts";

/** `GET /forms/{form_id}/webhooks` — all webhooks configured on a form. */
interface Input {
  formId: string;
  organizationId?: string;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List all webhooks configured on a form.",
  params: [formIdParam, organizationIdParam],
  output: [{ key: "result", type: "object", label: "Webhooks, shape as returned by VideoAsk" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity(
      `/forms/${encodeId(input.formId)}/webhooks`,
      { organizationId: input.organizationId },
    );
    return { result };
  },
};

export default webhookList;
