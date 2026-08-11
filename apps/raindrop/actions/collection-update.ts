import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, RaindropClient } from "../lib/client.ts";
import { collectionPathIdParam, collectionViewOptions } from "../lib/params.ts";

/**
 * `PUT /rest/v1/collection/{id}` — update one collection.
 *
 * A partial update: only the fields you send change. That is what makes it
 * idempotent — sending the same body twice leaves the same end state — so the
 * runtime may safely retry it after a dropped connection.
 *
 * `expanded` is writable *here*, on a single collection. The whole-account
 * "expand/collapse all" variant is deliberately not implemented; see the README
 * for why (the reference documents its parameter as a path parameter on a path
 * that has no such segment, and there is no second source to settle where it
 * actually goes).
 */
interface Input {
  id: number;
  title?: string;
  parentId?: number;
  view?: string;
  public?: boolean;
  expanded?: boolean;
  sort?: number;
  cover?: string;
}

const collectionUpdate: ActionDefinition<Input> = {
  key: "collection-update",
  type: "perform",
  resource: "collection",
  title: "Update Collection",
  description: "Change a collection's title, parent, view, visibility or order. Partial update.",
  idempotent: true,
  params: [
    collectionPathIdParam,
    { key: "title", label: "Title", type: "string" },
    {
      key: "parentId",
      label: "Parent collection",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Move the collection under another one. Sent as `parent.$id`.",
    },
    { key: "view", label: "View", type: "select", options: collectionViewOptions },
    {
      key: "public",
      label: "Public",
      type: "boolean",
      hint: "Turning this on makes the collection AND every bookmark in it readable by anyone " +
        "with the link, with no authentication.",
    },
    {
      key: "expanded",
      label: "Expanded",
      type: "boolean",
      advanced: true,
      hint: "Whether the collection's sub-collections show expanded in the sidebar.",
    },
    {
      key: "sort",
      label: "Sort position",
      type: "number",
      advanced: true,
      validation: { integer: true },
    },
    { key: "cover", label: "Cover URL", type: "string", advanced: true },
  ],
  output: [{ key: "item", type: "object", label: "Updated collection" }],

  async execute(input, ctx) {
    const body: Record<string, unknown> = compact({
      title: input.title,
      view: input.view,
      sort: input.sort,
      cover: input.cover ? [input.cover] : undefined,
    });
    // Booleans go through `compact` untouched only if truthy, so they are set
    // explicitly: `public: false` and `expanded: false` are exactly the values a
    // caller uses this action for.
    if (typeof input.public === "boolean") body.public = input.public;
    if (typeof input.expanded === "boolean") body.expanded = input.expanded;
    if (typeof input.parentId === "number" && Number.isFinite(input.parentId)) {
      body.parent = { $id: input.parentId };
    }

    return {
      item: await new RaindropClient(ctx).item(`/collection/${encodeId(input.id)}`, {
        method: "PUT",
        body,
      }),
    };
  },
};

export default collectionUpdate;
