import { assertEquals } from "@std/assert";
import totpSecretCreate from "../../actions/totp-secret-create.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("totp-secret-create: POSTs to /api/v2/totp/secrets", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", totp_secret: { id: "s1" } } }]);
  await totpSecretCreate.execute({ label: "GitHub", issuer: "GitHub" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/totp/secrets");
  assertEquals(jsonBodyOf(calls[0]), { label: "GitHub", issuer: "GitHub" });
});
