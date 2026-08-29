import { assertEquals } from "@std/assert";
import callroutersUpdate from "../../actions/callrouters-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("callrouters-update: PATCHes /callrouters/{id} and strips the signing secret", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "1", enabled: true, signature: { algo: "HS256", secret: "live-secret" } },
  }]);
  const out = await callroutersUpdate.execute(
    { callRouterId: "1", enabled: true, resetErrorCount: true },
    ctx,
  ) as { signature: { secret?: string } };

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/callrouters/1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.enabled, true);
  assertEquals(body.reset_error_count, true);
  assertEquals(out.signature.secret, undefined);
});

Deno.test("callrouters-update: declared idempotent", () => {
  assertEquals(callroutersUpdate.idempotent, true);
});
