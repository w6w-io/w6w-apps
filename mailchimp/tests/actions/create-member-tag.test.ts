import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-member-tag.ts";
import { subscriberHash } from "../../lib/subscriber-hash.ts";

Deno.test("create-member-tag: POSTs to .../tags with each tag marked active", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!(
    { listId: "abc", email: "u@example.com", tags: ["one", "two"] },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    `/3.0/lists/abc/members/${subscriberHash("u@example.com")}/tags`,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.tags, [
    { name: "one", status: "active" },
    { name: "two", status: "active" },
  ]);
  assertEquals(result, { success: true });
});

Deno.test("create-member-tag: forwards isSyncing when supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!(
    { listId: "abc", email: "u@example.com", tags: ["one"], isSyncing: true },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.is_syncing, true);
});
