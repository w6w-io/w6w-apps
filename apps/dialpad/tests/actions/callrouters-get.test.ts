import { assertEquals } from "@std/assert";
import callroutersGet from "../../actions/callrouters-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("callrouters-get: GETs /callrouters/{id} and strips the signing secret", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "1", signature: { algo: "HS256", secret: "live-secret" } },
  }]);
  const out = await callroutersGet.execute({ callRouterId: "1" }, ctx) as {
    signature: { secret?: string };
  };
  assertEquals(pathOf(calls[0].url), "/api/v2/callrouters/1");
  assertEquals(out.signature.secret, undefined);
});
