import type { ActionDefinition } from "@w6w/types";
import { PushbulletClient } from "../lib/client.ts";

/**
 * Delete a text — canceling it if not already sent, and deleting its attached
 * file unless `skip_delete_file` was set.
 *
 * ## `POST`, not `DELETE` — verified verbatim, not a typo carried over
 *
 * Every other delete-* endpoint in this API (`push`, `device`, `chat`,
 * `subscription`) is an HTTP `DELETE`. `delete-text` is the one exception:
 * the vendor's docs state, consistently in both the "Call" line and the
 * request field table, `POST https://api.pushbullet.com/v2/texts/{iden}` with
 * `{"iden": "..."}` as the body — the same host and path `update-text` uses,
 * distinguished only by the request having no `data` field. This was
 * cross-checked against `delete-device`'s docs, where the "Call" line
 * (`DELETE .../v2/devices`, no `{iden}`) contradicts its own worked curl
 * example (`DELETE .../v2/devices/{iden}`) — a same-page inconsistency this
 * app resolves in favor of the concrete example. `delete-text` has no such
 * contradiction to resolve: both statements of the method agree on `POST`, so
 * that is what this action sends.
 */
interface Input {
  iden: string;
}

const textDelete: ActionDefinition<Input> = {
  key: "text-delete",
  type: "perform",
  resource: "text",
  title: "Delete Text",
  description: "Delete a text, canceling it if it has not already been sent.",
  idempotent: true,
  params: [{ key: "iden", label: "Text ID", type: "string", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const status = await new PushbulletClient(ctx).status(
      `/texts/${encodeURIComponent(input.iden)}`,
      { method: "POST", body: { iden: input.iden } },
    );
    return { deleted: status === 200 };
  },
};

export default textDelete;
