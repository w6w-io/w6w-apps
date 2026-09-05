import { assertEquals } from "@std/assert";
import personsGet from "../../actions/persons-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("persons-get: calls GET /persons/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 38706, first_name: "John" } }]);
  const out = await personsGet.execute({ personId: 38706 }, ctx) as { first_name: string };
  assertEquals(pathOf(calls[0].url), "/persons/38706");
  assertEquals(out.first_name, "John");
});
