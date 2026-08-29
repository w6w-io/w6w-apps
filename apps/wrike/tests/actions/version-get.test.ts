import { assertEquals } from "@std/assert";
import versionGet from "../../actions/version-get.ts";
import { envelope, mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("version-get: GETs /version", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([{ major: 4, minor: 0 }]) }]);
  const out = await versionGet.execute({}, ctx) as { major: number; minor: number };
  assertEquals(pathOf(calls[0].url), "/api/v4/version");
  assertEquals(out, { major: 4, minor: 0 });
});
