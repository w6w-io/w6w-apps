import type { ActionDefinition } from "@w6w/types";
import { asJson, encodeId, LokaliseClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `POST /projects/{project_id}/keys` — create one or more keys.
 *
 * ## There is no single-key create
 *
 * Every key create on this API is bulk: even one key is sent as `{"keys":
 * [{...}]}`. A bare key object is rejected outright rather than treated as a
 * convenience shorthand.
 *
 * ## A `200` can still carry per-item failures
 *
 * The response is `{project_id, keys: [...succeeded], errors: [...failed]}` —
 * one HTTP status for a request that can partially fail. Creating two keys
 * where one name is already taken answers `200` with one entry in `keys` and
 * one `{message, code, key_name}` in `errors`. This action returns both
 * arrays rather than assuming a `200` means every key landed.
 *
 * Not marked idempotent: `key_name` uniqueness means a *retry* of a fully
 * successful call fails every item (each already exists), but a retry after a
 * *partial* failure only completes the missing ones — the net effect tracks
 * intent reasonably well in practice, but there is no vendor-issued
 * idempotency key to rely on, so the honest declaration is `false`.
 */
interface Input {
  projectId: string;
  keys: unknown;
}

const keyCreate: ActionDefinition<Input> = {
  key: "key-create",
  type: "perform",
  resource: "key",
  title: "Create Keys",
  description: "Create one or more keys, each with its per-language translations.",
  idempotent: false,
  params: [
    projectIdParam,
    {
      key: "keys",
      label: "Keys",
      type: "json",
      required: true,
      hint: 'Array of key objects, e.g. [{"key_name":"index.welcome","platforms":["web"],' +
        '"translations":[{"language_iso":"en","translation":"Welcome"}]}]. ' +
        "Sending up to 500 keys per request is recommended.",
    },
  ],
  output: [
    { key: "keys", type: "array", label: "Keys that were created" },
    { key: "errors", type: "array", label: "Per-item failures, if any" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(`/projects/${encodeId(input.projectId)}/keys`, {
      method: "POST",
      body: { keys: asJson(input.keys, "Keys") },
    });
  },
};

export default keyCreate;
