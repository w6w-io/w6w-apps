import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { users: [{ id: "7", email: "jo@x.com" }], next_page_token: "n" };

Deno.test("user-list: reads the users collection", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await userList.execute({}, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/users");
  assertEquals(out.count, 1);
});

/**
 * Both boolean clauses default to off on Keap's side, so an explicit `false`
 * would say nothing extra — they are sent only when switched on.
 */
Deno.test("user-list: the include flags are sent only when true", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }, { body: PAGE }]);
  await userList.execute({ includeInactive: true, includePartners: true }, ctx);
  assertEquals(
    queryOf(calls[0].url).filter,
    "include_inactive==true;include_partners==true",
  );
  await userList.execute({ includeInactive: false, includePartners: false }, ctx);
  assertEquals(queryOf(calls[1].url).filter, undefined);
});

Deno.test("user-list: the email and name clauses are built as documented", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await userList.execute({ email: "jo@x.com", givenName: "Mary" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "email==jo@x.com;given_name==Mary");
});

/** Deactivated users are hidden by default, which is usually wrong for an id lookup. */
Deno.test("user-list: the inactive hint explains why you would turn it on", () => {
  const hint = userList.params?.find((p) => p.key === "includeInactive")?.hint ?? "";
  assertEquals(/resolve an id on an old task/.test(hint), true);
});
