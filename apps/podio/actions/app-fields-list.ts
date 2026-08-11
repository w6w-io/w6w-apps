import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient } from "../lib/client.ts";
import { summarizeAppFields } from "../lib/fields.ts";
import { appIdParam } from "../lib/params.ts";

/**
 * The answer to "what do I put in `fields`?".
 *
 * Backed by `GET /app/{app_id}`, the same call as Get App, projected down to
 * the field schema: for each field its `field_id`, its `external_id` (Podio:
 * "External id automatically generated that will never change"), its type,
 * label, whether it is required, its type-specific `settings`, and — the part
 * that actually unblocks people — the sub_id vocabulary its *values* use.
 *
 * A Podio app's fields are defined by whoever built the app, so nothing in this
 * integration can know them ahead of time. This action is the discovery step
 * that makes the `fields` parameter on Create Item and Update Item writable
 * without guessing.
 *
 * For `category` fields it also surfaces the option list, because a category
 * value is the option **id** and not its text, and that single mismatch is the
 * most common way a write to Podio silently does nothing.
 *
 * The underlying response carries the app token; it is dropped before the
 * projection runs — this action returns only the field schema, never the app
 * envelope.
 */
interface Input {
  appId: string;
}

const appFieldsList: ActionDefinition<Input> = {
  key: "app-fields-list",
  type: "read",
  resource: "app",
  title: "Get App Fields",
  description: "The writable field schema of one Podio app: every field's id, external id, type, " +
    "label, settings and the sub_ids its values use. Run this before Create Item or " +
    "Update Item — the fields are user-defined, so nothing else can tell you their names.",
  params: [appIdParam],
  output: [
    { key: "fields", type: "array", label: "Field schema" },
    { key: "count", type: "number", label: "Number of fields" },
  ],

  async execute(input, ctx) {
    const app = await new PodioClient(ctx).json<Record<string, unknown>>(
      `/app/${encodeSegment(input.appId)}`,
    );
    const fields = summarizeAppFields(app);
    return { fields, count: fields.length };
  },
};

export default appFieldsList;
