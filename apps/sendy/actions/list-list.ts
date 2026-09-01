import type { ActionDefinition } from "@w6w/types";
import { GET_LISTS_PATH, sendyPostJson } from "../lib/client.ts";

interface Input {
  brandId: string;
  includeHidden?: boolean;
}

interface SendyList {
  id?: string;
  name?: string;
}

/**
 * `POST /api/lists/get-lists.php` — every list (id and name) belonging to a
 * brand. Sendy's docs describe the success shape only as "a list of lists
 * (ids and names) in JSON format" without naming the field types precisely,
 * so the two fields here (`id`, `name`) are the only ones asserted.
 */
const listList: ActionDefinition<Input> = {
  key: "list-list",
  type: "read",
  resource: "list",
  title: "Get Lists",
  description: "All lists (ids and names) belonging to a brand.",
  params: [
    {
      key: "brandId",
      label: "Brand ID",
      type: "string",
      required: true,
      hint: "From the Brands page.",
    },
    {
      key: "includeHidden",
      label: "Include hidden lists",
      type: "boolean",
      default: false,
    },
  ],
  output: [{ key: "lists", type: "array", label: "Lists" }],

  async execute(input, ctx) {
    ctx.log("info", "reading lists", { brand: input.brandId });
    const lists = await sendyPostJson<SendyList[]>(ctx, GET_LISTS_PATH, {
      brand_id: input.brandId,
      include_hidden: input.includeHidden ? "yes" : undefined,
    });
    return { lists };
  },
};

export default listList;
