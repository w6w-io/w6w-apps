import type { ActionDefinition } from "@w6w/types";
import {
  asJsonObject,
  asOptionalJson,
  encodeSegment,
  flag,
  PodioClient,
  toList,
} from "../lib/client.ts";
import { appIdParam, fieldsParam, writeSwitchParams } from "../lib/params.ts";

/**
 * `POST /item/app/{app_id}/` — "Adds a new item to the given app."
 *
 * ## The `fields` map is the whole problem, stated plainly
 *
 * A Podio app's fields are user-defined, so this action cannot present them as
 * form controls and does not pretend to. `fields` is a JSON object keyed by
 * each field's `external_id` or numeric `field_id`, and Podio documents four
 * accepted value forms per field, all equivalent:
 *
 *   - a scalar — `"Acme Ltd"`
 *   - an object of sub_ids — `{"value": "500.00", "currency": "USD"}`
 *   - an array of scalars — `[12345, 67890]` (multiple references)
 *   - an array of sub_id objects — `[{"value": 1}, {"value": 2}]`
 *
 * Run Get App Fields against the app first: it returns every key, its type, and
 * which sub_ids that type's values use. Two mistakes account for most failed
 * writes, and both are silent rather than loud — a `category` value must be the
 * option **id**, not the option text; and a `date` field's sub_ids are
 * `start_date` / `start_time` / `end_date` / `end_time`, not `value`.
 *
 * ## Not idempotent, and it cannot be made so
 *
 * Podio's create endpoint accepts no idempotency key of any kind, so every call
 * creates a new item. A retry after a dropped connection produces a duplicate.
 *
 * `external_id` is the closest thing to a guard and it is worth using, but it
 * is not one on its own: Podio does not enforce uniqueness on it. The pattern
 * that actually works is Get Item by External ID first, then create only if it
 * 404s — with the same caveat that pattern always carries about racing itself.
 */
interface Input {
  appId: string;
  fields: unknown;
  externalId?: string;
  tags?: string[] | string;
  fileIds?: unknown;
  hook?: boolean;
  silent?: boolean;
}

const itemCreate: ActionDefinition<Input> = {
  key: "item-create",
  type: "perform",
  resource: "item",
  title: "Create Item",
  description:
    "Add an item to a Podio app. Field values are supplied as a JSON object keyed by field " +
    "external id — run Get App Fields to see the keys and their sub_ids.",
  idempotent: false,
  params: [
    appIdParam,
    fieldsParam(true),
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "Your own system's id for this record, so Get Item by External ID can find it " +
        "later. Podio does not enforce uniqueness — keep it unique yourself.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "multiselect",
      hint: "Free-text tags to put on the item.",
    },
    {
      key: "fileIds",
      label: "File IDs",
      type: "json",
      advanced: true,
      placeholder: "[123456, 123457]",
      hint: "Ids of files already uploaded to Podio, to attach to this item. This app does " +
        "not upload files — see the README.",
    },
    ...writeSwitchParams(),
  ],
  output: [
    { key: "itemId", type: "number", label: "New item id" },
    { key: "title", type: "string", label: "Item title" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {
      fields: asJsonObject(input.fields, "Field values"),
    };
    if (input.externalId) body.external_id = input.externalId;
    const tags = toList(input.tags);
    if (tags) body.tags = tags;
    const fileIds = asOptionalJson<unknown[]>(input.fileIds, "File IDs");
    if (fileIds !== undefined) body.file_ids = fileIds;

    ctx.log("info", "creating Podio item", { appId: input.appId });
    const created = await new PodioClient(ctx).json<{ item_id?: number; title?: string }>(
      `/item/app/${encodeSegment(input.appId)}/`,
      {
        method: "POST",
        body,
        query: { hook: flag(input.hook), silent: flag(input.silent) },
      },
    );
    return { itemId: created?.item_id, title: created?.title };
  },
};

export default itemCreate;
