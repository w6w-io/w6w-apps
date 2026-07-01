import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-update.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("user-update: POSTs /users/{id} with the id in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ userId: 42, name: "New Name" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wp/v2/users/42");
  assertEquals(JSON.parse(calls[0].body!), { id: 42, name: "New Name" });
});

Deno.test("user-update: only sends fields the caller provided", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ userId: 42, email: "x@y.co" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: 42, email: "x@y.co" });
});

Deno.test("user-update: maps camelCase name fields to snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ userId: 42, firstName: "F", lastName: "L" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: 42, first_name: "F", last_name: "L" });
});
