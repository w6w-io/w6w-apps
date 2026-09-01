import { assertEquals } from "@std/assert";
import sequenceGet from "../../actions/sequence-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sequence-get: GETs /v3/sequences/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9, name: "Cold outreach", status: "active" } }]);
  const out = await sequenceGet.execute({ id: 9 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/sequences/9");
  assertEquals(out, { id: 9, name: "Cold outreach", status: "active" });
});
