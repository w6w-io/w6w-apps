import { assertEquals } from "@std/assert";
import totpSecretList from "../../actions/totp-secret-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("totp-secret-list: GETs /api/v2/totp/secrets with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", totp_secrets: [] } }]);
  await totpSecretList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/totp/secrets");
});
