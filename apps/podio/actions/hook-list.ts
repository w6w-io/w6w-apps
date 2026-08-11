import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient } from "../lib/client.ts";
import { refIdParam, refTypeParam } from "../lib/params.ts";

/**
 * `GET /hook/{ref_type}/{ref_id}/` — "Returns the hooks on the object."
 *
 * Podio's webhooks are attached to an app or a workspace, not to an account, so
 * there is no "list all my hooks" call — you ask per object. Each entry is
 * `{hook_id, status, type, url}`, and `status` is the field that matters:
 * `active` or **`inactive`**. A newly created hook is inactive until it has
 * been verified, and an inactive hook delivers nothing while looking perfectly
 * well-formed. See Create Webhook for the two-step verification.
 */
interface Input {
  refType: string;
  refId: string;
}

const HOOKABLE = ["app", "space"];

const hookList: ActionDefinition<Input> = {
  key: "hook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "The webhooks on one app or workspace, with each hook's status. A hook reading " +
    "“inactive” has not completed verification and is delivering nothing.",
  params: [
    refTypeParam(HOOKABLE, "Podio attaches webhooks to an app or a workspace."),
    refIdParam(),
  ],
  output: [{ key: "hooks", type: "array", label: "Webhooks" }],

  async execute(input, ctx) {
    const hooks = await new PodioClient(ctx).json<unknown[]>(
      `/hook/${encodeSegment(input.refType)}/${encodeSegment(input.refId)}/`,
    );
    return { hooks: hooks ?? [] };
  },
};

export default hookList;
