import { assertEquals } from "@std/assert";
import householdList from "../../actions/household-list.ts";
import { mockCtx, pageEnvelope, pathOf } from "../_helpers.ts";

Deno.test("household-list: hits /households", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([{ id: 1, name: "The Smiths" }]) }]);
  const out = await householdList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/households");
  assertEquals((out as { data: unknown[] }).data.length, 1);
});
