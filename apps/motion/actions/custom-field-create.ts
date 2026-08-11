import type { ActionDefinition } from "@w6w/types";
import { BETA, encodeId, MotionClient, omitUndefined, optionalJson } from "../lib/client.ts";
import { customFieldTypeOptions, workspaceIdParam } from "../lib/params.ts";

/**
 * `POST /beta/workspaces/{workspaceId}/custom-fields` — define a custom field.
 *
 * ## `type` on the way in, `field` on the way out
 *
 * The request body names the field's type `type`; the list endpoint returns the
 * same thing under the key `field`. Same vocabulary, two names, in adjacent
 * endpoints.
 *
 * ## `metadata` is per-type and free-form
 *
 * Only three of the twelve types use it, and each uses it differently:
 *
 *  - `number` — `{"format": "plain" | "formatted" | "percent"}`
 *  - `checkbox` — `{"toggle": true | false}`
 *  - `select` / `multiSelect` — `{"options": [{"id", "value", "color"}]}`, where
 *    `value` is the label shown on screen and `color` is a hex code with no
 *    alpha
 *
 * It is a `json` param because a `group` cannot be three different shapes
 * selected by a sibling field. The nine remaining types take no metadata.
 *
 * Not idempotent: no idempotency key exists, so a retry defines a second field
 * with the same name.
 */
interface Input {
  workspaceId: string;
  name: string;
  type: string;
  metadata?: unknown;
}

const customFieldCreate: ActionDefinition<Input> = {
  key: "custom-field-create",
  type: "perform",
  resource: "custom-field",
  title: "Create Custom Field",
  description: "Define a new custom field on a workspace.",
  idempotent: false,
  params: [
    workspaceIdParam(true),
    { key: "name", label: "Field name", type: "string", required: true },
    {
      key: "type",
      label: "Field type",
      type: "select",
      required: true,
      options: customFieldTypeOptions,
      hint: "Sent as `type`; the list endpoint returns the same value under the key `field`.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      placeholder: '{"options": [{"value": "Red", "color": "#ff0000"}]}',
      hint: 'Only three types use it: number → {"format": "plain"|"formatted"|"percent"}, ' +
        'checkbox → {"toggle": true|false}, select/multiSelect → {"options": [{"id", "value", ' +
        '"color"}]} where value is the on-screen label and color is a hex code with no alpha.',
    },
  ],
  output: [
    {
      key: "id",
      type: "string",
      label: "Custom field ID — the customFieldInstanceId to write with",
    },
    { key: "type", type: "string", label: "Field type" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating Motion custom field", { workspaceId: input.workspaceId });
    return new MotionClient(ctx).json(
      `${BETA}/workspaces/${encodeId(input.workspaceId)}/custom-fields`,
      {
        method: "POST",
        body: omitUndefined({
          name: input.name,
          type: input.type,
          metadata: optionalJson(input.metadata, "Metadata"),
        }),
      },
    );
  },
};

export default customFieldCreate;
