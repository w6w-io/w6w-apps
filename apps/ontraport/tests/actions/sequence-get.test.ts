import { assertEquals } from "@std/assert";
import sequenceGet from "../../actions/sequence-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("sequence-get: calls GET /1/object with objectID=5 and id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", name: "Welcome Sequence" }) }]);
  const out = await sequenceGet.execute({ id: "1" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/1/object");
  assertEquals(queryOf(calls[0].url), { objectID: "5", id: "1" });
  assertEquals(out.name, "Welcome Sequence");
});
