import type { ActionDefinition } from "@w6w/types";
import { buildQuery, GetResponseClient } from "../lib/client.ts";

/**
 * `GET /from-fields` — the account's verified sender addresses.
 *
 * Create Newsletter requires a `fromFieldId`, and this is where it comes from.
 * The `isActive` field is the one to check: GetResponse will not send from an
 * address whose verification has not been completed, and a newsletter naming an
 * inactive from-field is rejected at create time rather than at send time.
 */
interface Input {
  page?: number;
  perPage?: number;
}

const fromFieldList: ActionDefinition<Input> = {
  key: "from-field-list",
  type: "search",
  resource: "from-field",
  title: "List From Fields",
  description:
    "List the account's sender addresses. Create Newsletter needs one of these ids, and only an " +
    "active (verified) address can send.",
  params: [
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1, max: 1000 },
    },
  ],
  output: [
    { key: "[]", type: "array", label: "From fields — `fromFieldId`, `email`, `isActive`" },
  ],

  execute(input, ctx) {
    return new GetResponseClient(ctx).request("/from-fields", {
      query: buildQuery({ page: input.page, perPage: input.perPage }),
    });
  },
};

export default fromFieldList;
