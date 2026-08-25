import { assertEquals } from "@std/assert";
import totpGetCode from "../../actions/totp-get-code.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("totp-get-code: GETs /api/v2/totp/code/{secret_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: "482031", expires_in: 14 } }]);
  const out = await totpGetCode.execute({ secretId: "sec1" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/totp/code/sec1");
  assertEquals(out.code, "482031");
});
