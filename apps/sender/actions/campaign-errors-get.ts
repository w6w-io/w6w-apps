import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/**
 * `GET /v2/campaigns/{id}/errors` — reasons this campaign cannot be sent yet.
 *
 * Answers `{"errors": [...], "warnings": [...]}` — no `data` envelope, per the
 * vendor's own worked example.
 */
interface Input {
  id: string;
}

const campaignErrorsGet: ActionDefinition<Input> = {
  key: "campaign-errors-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Errors",
  description: "List the reasons this campaign cannot currently be sent.",
  params: [{ key: "id", label: "Campaign ID", type: "string", required: true }],
  output: [
    { key: "errors", type: "array", label: "Blocking errors" },
    { key: "warnings", type: "array", label: "Warnings" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/campaigns/${encodeURIComponent(input.id)}/errors`);
  },
};

export default campaignErrorsGet;
