import { assertEquals } from "@std/assert";
import pledgeGet from "../../actions/pledge-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pledge-get: fetches /pledges/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", status: "active" }) }]);
  const out = await pledgeGet.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pledges/1");
  assertEquals(out, { id: "1", status: "active" });
});
