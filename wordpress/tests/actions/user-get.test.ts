import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("user-get: GETs /users/{id} and returns the response", async () => {
  const body = { id: 1, name: "Alice" };
  const { ctx, calls } = mockCtx([{ body }], { display });
  const result = await action.execute!({ userId: "1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wp/v2/users/1");
  assertEquals(result, body);
});

Deno.test("user-get: `me` resolves to /users/me for the authenticated user", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ userId: "me" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wp/v2/users/me");
});

Deno.test("user-get: forwards context when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ userId: "1", context: "edit" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("context"), "edit");
});
