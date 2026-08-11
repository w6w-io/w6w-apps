import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-drive.ts";

Deno.test("get-drive: defaults to the signed-in user's own drive", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive");
});

Deno.test("get-drive: a drive id addresses the top-level drives collection", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  await action.execute({ driveId: "b!abc" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/drives/b!abc");
});

Deno.test("get-drive: maps $select", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ select: ["id", "quota"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), "id,quota");
});

Deno.test("get-drive: returns the quota facet the health check reads", async () => {
  const { ctx } = mockCtx([{
    body: {
      id: "d1",
      driveType: "business",
      quota: { total: 100, used: 40, remaining: 60, deleted: 1, state: "normal" },
    },
  }]);
  const out = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals((out.quota as Record<string, unknown>).state, "normal");
  assertEquals(out.driveType, "business");
});
