import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam, respondentIdParam } from "../lib/params.ts";

/** `DELETE /respondents/{respondent_id}` — delete a contact record. */
interface Input {
  respondentId: string;
  organizationId?: string;
}

const respondentDelete: ActionDefinition<Input> = {
  key: "respondent-delete",
  type: "perform",
  resource: "respondent",
  title: "Delete Contact",
  description: "Delete a respondent (contact) record.",
  idempotent: true,
  params: [respondentIdParam, organizationIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new VideoAskClient(ctx).status(
      `/respondents/${encodeId(input.respondentId)}`,
      { method: "DELETE", organizationId: input.organizationId },
    );
    return { status };
  },
};

export default respondentDelete;
