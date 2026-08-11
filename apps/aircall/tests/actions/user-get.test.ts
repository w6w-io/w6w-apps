import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { entityBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: reads GET /v2/users/{id} and unwraps the user envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: entityBody("user", { id: 456, name: "John Doe" }) }]);
  const out = await userGet.execute({ userId: "456" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/v2/users/456");
  assertEquals(out.name, "John Doe");
});

/**
 * Aircall documents `GET /v2/users/john.doe@aircall.io` verbatim, so `@` and `.`
 * must survive path escaping or every email lookup 404s.
 */
Deno.test("user-get: an email address survives path escaping intact", async () => {
  const { ctx, calls } = mockCtx([{ body: entityBody("user", { id: 456 }) }]);
  await userGet.execute({ userId: "john.doe@aircall.io" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/users/john.doe@aircall.io");
});

Deno.test("user-get: a slash pasted into the id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: entityBody("user", {}) }]);
  await userGet.execute({ userId: "456/../../company" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/users/456%2F..%2F..%2Fcompany");
});
