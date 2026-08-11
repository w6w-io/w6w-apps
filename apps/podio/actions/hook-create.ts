import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient } from "../lib/client.ts";
import { refIdParam, refTypeParam } from "../lib/params.ts";

/**
 * `POST /hook/{ref_type}/{ref_id}/` — "Create a new hook on the given object."
 *
 * ## A new hook does not work yet, and Podio does not say so
 *
 * The response is `{hook_id}` and the call succeeds. The hook is nevertheless
 * **inactive** and delivers nothing until it has been verified, which is a
 * separate three-step handshake:
 *
 *   1. `POST /hook/{hook_id}/verify/request` — Request Webhook Verification,
 *      the action beside this one. Podio then calls the hook's own URL with
 *      `type=hook.verify` and a `code`.
 *   2. Your endpoint receives that code. Nothing in this app can see it: the
 *      code arrives at *your* URL, not here.
 *   3. `POST /hook/{hook_id}/verify/validate` with the code, which activates
 *      the hook.
 *
 * Step 3 is deliberately **not** an action in this app. It needs a value only
 * the receiving endpoint ever holds, so an action for it would be a form field
 * nobody can fill in from a workflow; and Podio's reference carries no App
 * Authentication badge on it, unlike steps 1 and 2. The README says the same in
 * fewer words. List Webhooks shows whether a hook made it to `active`.
 *
 * ## Not idempotent
 *
 * Creating the same URL and type twice yields two hooks with two ids and two
 * deliveries per event. Podio does not deduplicate. Read List Webhooks first.
 */
interface Input {
  refType: string;
  refId: string;
  url: string;
  type: string;
}

const HOOKABLE = ["app", "space"];

const hookCreate: ActionDefinition<Input> = {
  key: "hook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Register a webhook on an app or workspace. The hook is created INACTIVE — run Request " +
    "Webhook Verification next, then have your endpoint validate the code Podio sends it.",
  idempotent: false,
  params: [
    refTypeParam(HOOKABLE, "Podio attaches webhooks to an app or a workspace."),
    refIdParam(),
    {
      key: "url",
      label: "Endpoint URL",
      type: "string",
      required: true,
      hint: "Where Podio should POST. This URL also has to answer the verification " +
        "handshake before the hook goes active.",
    },
    {
      key: "type",
      label: "Event type",
      type: "string",
      required: true,
      placeholder: "item.create",
      hint: "The event to listen for, e.g. item.create, item.update, item.delete, " +
        "comment.create. Podio lists the full vocabulary per object type in its Hooks " +
        "area; it is not exposed as a fixed dropdown here because the valid set depends " +
        "on whether the hook is on an app or a workspace.",
    },
  ],
  output: [{ key: "hookId", type: "number", label: "New hook id" }],

  async execute(input, ctx) {
    const created = await new PodioClient(ctx).json<{ hook_id?: number }>(
      `/hook/${encodeSegment(input.refType)}/${encodeSegment(input.refId)}/`,
      { method: "POST", body: { url: input.url, type: input.type } },
    );
    ctx.log("info", "created Podio webhook — inactive until verified", {
      hookId: created?.hook_id,
    });
    return { hookId: created?.hook_id };
  },
};

export default hookCreate;
