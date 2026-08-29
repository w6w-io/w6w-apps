import { assertEquals } from "@std/assert";
import pushUpdate from "../../actions/push-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("push-update: POSTs {dismissed} to /v2/pushes/{iden}", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "p1", dismissed: true } }]);
  const out = await pushUpdate.execute({ iden: "p1", dismissed: true }, ctx) as {
    dismissed: boolean;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/pushes/p1");
  assertEquals(JSON.parse(calls[0].body!), { dismissed: true });
  assertEquals(out.dismissed, true);
});

Deno.test("push-update: is declared idempotent", () => {
  assertEquals(pushUpdate.idempotent, true);
});

Deno.test("push-update: encodes the iden into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await pushUpdate.execute({ iden: "id with space", dismissed: false }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/pushes/id%20with%20space");
});
