import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-identity.ts";

Deno.test("get-identity: GETs /identity with sparse fieldsets and include", async () => {
  const body = { data: { id: "u1", type: "user", attributes: { full_name: "Ada" } } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({
    include: "memberships,campaign",
    userFields: "full_name,email",
  }, ctx);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/oauth2/v2/identity");
  assertEquals(url.searchParams.get("include"), "memberships,campaign");
  assertEquals(url.searchParams.get("fields[user]"), "full_name,email");
  assertEquals(out, body);
});

Deno.test("get-identity: works with no params at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "u1", type: "user" } } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("include"), false);
  assertEquals(url.searchParams.has("fields[user]"), false);
});
