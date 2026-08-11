import type { ActionDefinition } from "@w6w/types";
import {
  asJsonObject,
  asOptionalJson,
  encodeSegment,
  flag,
  PodioClient,
  toList,
} from "../lib/client.ts";
import { fieldsParam, itemIdParam, writeSwitchParams } from "../lib/params.ts";

/**
 * `PUT /item/{item_id}` — "Update an already existing item."
 *
 * ## Partial by default, and the way to clear a field is not obvious
 *
 * Podio: "Values will only be updated for fields included. To delete all values
 * for a field supply an **empty array** as values for that field." So omitting
 * a field leaves it alone, and `{"notes": []}` is what empties one — `null` and
 * `""` are values, not erasures.
 *
 * ## The revision guard is optional and worth using
 *
 * Podio: "When revision is specified in the body, the update method will check
 * that the changes will no[t] conflict with changes made since that revision.
 * If a conflict is detected, HTTP status code 409 is returned." Read the item,
 * pass back its `current_revision.revision`, and a concurrent edit by a human
 * fails the write instead of silently overwriting them. Without it, last writer
 * wins.
 *
 * ## Marked idempotent, with one thing to know
 *
 * Repeating the same update converges on the same item state, so the runtime
 * may safely retry a dropped connection — that is what `idempotent` means here.
 * What it does not mean is that the retry is invisible: each successful call
 * creates a new revision and, unless `hook` is off, fires the app's webhooks
 * again. If a webhook downstream is not itself idempotent, turn `hook` off for
 * this write.
 *
 * Supplying a `revision` makes the retry safe in the stronger sense too: the
 * second attempt 409s rather than writing twice.
 */
interface Input {
  itemId: string;
  fields: unknown;
  revision?: number;
  externalId?: string;
  tags?: string[] | string;
  fileIds?: unknown;
  hook?: boolean;
  silent?: boolean;
}

const itemUpdate: ActionDefinition<Input> = {
  key: "item-update",
  type: "perform",
  resource: "item",
  title: "Update Item",
  description:
    "Change field values on an item. Only the fields you include are touched; an empty " +
    "array clears a field. Pass a revision to fail rather than overwrite a concurrent edit.",
  idempotent: true,
  params: [
    itemIdParam,
    fieldsParam(
      true,
      "Only the fields present are changed; supply [] as a field's value to clear it.",
    ),
    {
      key: "revision",
      label: "Expected revision",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "From the item's current_revision.revision. Podio returns 409 if the item " +
        "changed since then, instead of overwriting the change.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      advanced: true,
      hint: "Replaces the item's external id.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "multiselect",
      advanced: true,
      hint: "Replaces the item's whole tag list.",
    },
    {
      key: "fileIds",
      label: "File IDs",
      type: "json",
      advanced: true,
      placeholder: "[123456]",
      hint: "Replaces the item's whole attachment list with these already-uploaded file ids.",
    },
    ...writeSwitchParams(),
  ],
  output: [
    { key: "revision", type: "number", label: "New revision id" },
    { key: "title", type: "string", label: "New item title" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {
      fields: asJsonObject(input.fields, "Field values"),
    };
    if (input.revision !== undefined) body.revision = input.revision;
    if (input.externalId) body.external_id = input.externalId;
    const tags = toList(input.tags);
    if (tags) body.tags = tags;
    const fileIds = asOptionalJson<unknown[]>(input.fileIds, "File IDs");
    if (fileIds !== undefined) body.file_ids = fileIds;

    const updated = await new PodioClient(ctx).json<{ revision?: number; title?: string }>(
      `/item/${encodeSegment(input.itemId)}`,
      {
        method: "PUT",
        body,
        query: { hook: flag(input.hook), silent: flag(input.silent) },
      },
    );
    return { revision: updated?.revision, title: updated?.title };
  },
};

export default itemUpdate;
