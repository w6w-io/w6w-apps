import type { ActionDefinition } from "@w6w/types";
import { QualtricsClient } from "../lib/client.ts";
import { maxPagesParam } from "../lib/params.ts";

interface Input {
  maxPages?: number;
}

/**
 * `GET /API/v3/users` — the account's users.
 *
 * Confirmed live on 2026-09-22 (`400 ATP_2` unauthenticated, not a 404). This is
 * an administration endpoint and may need an account-level token rather than a
 * survey-scoped one; a refusal is reported verbatim from the response body
 * rather than flattened into "forbidden".
 */
const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List the users in this Qualtrics account.",
  params: [maxPagesParam],
  output: [
    { key: "elements", type: "array", label: "Users" },
    { key: "count", type: "number", label: "Users returned" },
    { key: "pages", type: "number", label: "Pages fetched" },
    { key: "nextPage", type: "string", label: "URL of the next page, when more results exist" },
  ],

  async execute(input, ctx) {
    const { elements, nextPage, pages } = await new QualtricsClient(ctx).list("/users", {
      maxPages: input.maxPages,
    });
    return { elements, count: elements.length, pages, nextPage };
  },
};

export default userList;
