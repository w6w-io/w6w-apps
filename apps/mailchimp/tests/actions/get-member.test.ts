import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-member.ts";
import { subscriberHash } from "../../lib/subscriber-hash.ts";

Deno.test("get-member: GETs /lists/{id}/members/{hash}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  const result = await action.execute!(
    { listId: "abc", email: "u@example.com" },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(
    new URL(calls[0].url).pathname,
    `/3.0/lists/abc/members/${subscriberHash("u@example.com")}`,
  );
  assertEquals(result, { id: "m1" });
});

Deno.test("get-member: forwards fields / exclude_fields as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      listId: "abc",
      email: "u@example.com",
      fields: "email_address,status",
      excludeFields: "_links",
    },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("fields"), "email_address,status");
  assertEquals(params.get("exclude_fields"), "_links");
});
