import { assertEquals } from "@std/assert";
import methodListAll from "../../actions/method-list-all.ts";
import { list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("method-list-all: fetches /methods/all", async () => {
  const { ctx, calls } = mockCtx([{
    body: list("methods", [{ id: "ideal", status: "activated" }]),
  }]);
  const out = await methodListAll.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/methods/all");
  assertEquals(out, { count: 1, items: [{ id: "ideal", status: "activated" }] });
});
