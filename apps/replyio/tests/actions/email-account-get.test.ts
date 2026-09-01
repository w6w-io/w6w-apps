import { assertEquals } from "@std/assert";
import emailAccountGet from "../../actions/email-account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("email-account-get: GETs /v3/email-accounts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3, connectionStatus: "connected" } }]);
  const out = await emailAccountGet.execute({ id: 3 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/email-accounts/3");
  assertEquals(out, { id: 3, connectionStatus: "connected" });
});
