import type { ActionDefinition } from "@w6w/types";
import { BETA, encodeId, MotionClient } from "../lib/client.ts";
import { workspaceIdParam } from "../lib/params.ts";

/**
 * `GET /beta/workspaces/{workspaceId}/custom-fields` — a workspace's custom
 * field definitions.
 *
 * ## `/beta`, not `/v1`
 *
 * The entire custom-field surface — definitions here, values on the four
 * `custom-field-values` endpoints — lives under `/beta` on the same host. There
 * is no `/v1` alias and no redirect: `GET /v1/workspaces/{id}/custom-fields`
 * answers `404 Cannot GET …` (measured 2026-08-11) while this path answers
 * `401 Unauthorized`.
 *
 * ## The id here is the one you write with
 *
 * Each entry is `{id, field}` where `field` is the type. That `id` is the
 * `customFieldInstanceId` the two "set value" actions require. It is **not** the
 * key a task's or project's `customFieldValues` is indexed by — those are keyed
 * by the field's *name*. Reading a value and writing one therefore use two
 * different identifiers for the same field, and this is the endpoint that
 * connects them.
 *
 * Answers a bare array with no envelope and no cursor; wrapped as `items` for
 * uniformity.
 */
interface Input {
  workspaceId: string;
}

const customFieldList: ActionDefinition<Input> = {
  key: "custom-field-list",
  type: "read",
  resource: "custom-field",
  title: "List Custom Fields",
  description:
    "List a workspace's custom field definitions. Their ids are what the set-value actions need " +
    "— a task's customFieldValues is keyed by field NAME instead.",
  params: [workspaceIdParam(true)],
  output: [
    { key: "items", type: "array", label: "Custom fields — each { id, field }" },
  ],

  async execute(input, ctx) {
    const items = await new MotionClient(ctx).json<unknown[]>(
      `${BETA}/workspaces/${encodeId(input.workspaceId)}/custom-fields`,
    );
    return { items: items ?? [] };
  },
};

export default customFieldList;
