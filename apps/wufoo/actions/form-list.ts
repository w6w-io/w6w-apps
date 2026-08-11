import type { ActionDefinition } from "@w6w/types";
import { unwrap, WufooClient } from "../lib/client.ts";

/**
 * `GET /forms.json` — every form on the account.
 *
 * This is where a form's **Hash** comes from, and every other action needs one.
 * The response also carries `LinkFields`, `LinkEntries` and `LinkEntriesCount`
 * per form — ready-made URLs for the sibling actions.
 *
 * `includeTodayCount` adds today's entry count to each form, which is one
 * request instead of one Entry Count call per form.
 */
interface Input {
  includeTodayCount?: boolean;
}

const formList: ActionDefinition<Input> = {
  key: "form-list",
  type: "search",
  resource: "form",
  title: "List Forms",
  description:
    "List every form on the account. Start here — the `Hash` on each form is what the other " +
    "actions take.",
  params: [
    {
      key: "includeTodayCount",
      label: "Include today's entry count",
      type: "boolean",
      hint: "Adds each form's entry count for today, saving one call per form.",
    },
  ],
  output: [{ key: "[]", type: "array", label: "Forms — `Hash` is the identifier to reuse" }],

  async execute(input, ctx) {
    const body = await new WufooClient(ctx).request("/forms.json", {
      query: { includeTodayCount: input.includeTodayCount },
    });
    return unwrap(body, "Forms");
  },
};

export default formList;
