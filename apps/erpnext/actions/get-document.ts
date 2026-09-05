import type { ActionDefinition } from "@w6w/types";
import { ErpNextClient } from "../lib/client.ts";
import { DOCTYPE_PARAM, NAME_PARAM } from "../lib/params.ts";

interface Input {
  doctype: string;
  name: string;
  expandLinks?: boolean;
}

/**
 * `GET /api/resource/:doctype/:name` — read one document of any DocType.
 *
 * `expand_links` is documented as an opt-in: without it, Link fields (e.g. a
 * Sales Order's `customer`) come back as the bare linked name; with it, each
 * Link field is replaced by an object carrying that linked document's own
 * `name`, `title` and `creation` fields.
 */
const getDocument: ActionDefinition<Input> = {
  key: "get-document",
  type: "read",
  title: "Get Document",
  description: "Read one document of any DocType by its `name` (Frappe's primary key, not a " +
    "display title).",
  params: [
    DOCTYPE_PARAM,
    NAME_PARAM,
    {
      key: "expandLinks",
      label: "Expand Links",
      type: "boolean",
      default: false,
      hint: "Replace each Link field with the linked document's own name, title and creation " +
        "date, instead of just its bare name.",
    },
  ],
  output: [{ key: "document", type: "object", label: "The document" }],

  async execute(input, ctx) {
    const body = await new ErpNextClient(ctx).resource<{ data: Record<string, unknown> }>(
      `/${encodeURIComponent(input.doctype)}/${encodeURIComponent(input.name)}`,
      { query: input.expandLinks ? { expand_links: "True" } : undefined },
    );
    return { document: body?.data ?? {} };
  },
};

export default getDocument;
