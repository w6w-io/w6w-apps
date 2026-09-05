import { assertEquals } from "@std/assert";
import textGet from "../../actions/text-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("text-get: hits GET /v2.1/texts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 15112, direction: "Outbound" }) }]);
  const out = await textGet.execute({ id: 15112 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2.1/texts/15112");
  assertEquals(out.direction, "Outbound");
});
