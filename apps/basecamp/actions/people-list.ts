import type { ActionDefinition } from "@w6w/types";
import { BasecampClient } from "../lib/client.ts";

/**
 * `GET /people.json` — everyone on the account.
 *
 * This is where the `assignee_ids` that Create To-do takes come from. Basecamp
 * addresses people by numeric id everywhere; there is no assign-by-email.
 */
interface Input {
  page?: number;
}

const peopleList: ActionDefinition<Input> = {
  key: "people-list",
  type: "search",
  resource: "person",
  title: "List People",
  description:
    "List everyone on the account. Their ids are what Create To-do's assignees take — Basecamp " +
    "has no assign-by-email.",
  params: [{ key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } }],
  output: [{ key: "[]", type: "array", label: "People — `id`, `name`, `email_address`" }],

  execute(input, ctx) {
    return new BasecampClient(ctx).request("/people.json", { query: { page: input.page } });
  },
};

export default peopleList;
