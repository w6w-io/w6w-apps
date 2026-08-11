import { assert, assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-list: calls GET /api/v2/users with page[number]/page[size]", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "u1" }], meta: {} } }]);
  const out = await userList.execute({ pageNumber: 2, pageSize: 50 }, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v2/users");
  assertEquals(queryOf(calls[0].url), { "page[number]": "2", "page[size]": "50" });
  assertEquals(out.data, [{ id: "u1" }]);
});

/**
 * Three v2 pagination styles in one API: cursor for events and logs,
 * `page[offset]` for downtimes, `page[number]` here.
 */
Deno.test("user-list: it pages by number, not by cursor or offset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await userList.execute({ pageNumber: 0 }, ctx);
  const query = queryOf(calls[0].url);
  assert("page[number]" in query, JSON.stringify(query));
  assert(!("page[cursor]" in query));
  assert(!("page[offset]" in query));
});

Deno.test("user-list: the status filter uses the bracketed name and free text does not", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await userList.execute({ filter: "ada", status: "Active", sort: "-name", sortDir: "desc" }, ctx);
  assertEquals(queryOf(calls[0].url), {
    filter: "ada",
    "filter[status]": "Active",
    sort: "-name",
    sort_dir: "desc",
  });
});

/** The list includes deactivated and unverified users, so it is not a headcount. */
Deno.test("user-list: the description warns that disabled users are included", () => {
  assert(userList.description?.includes("deactivated and unverified"));
});
