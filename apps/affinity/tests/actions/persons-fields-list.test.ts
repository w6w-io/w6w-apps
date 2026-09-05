import { assertEquals } from "@std/assert";
import personsFieldsList from "../../actions/persons-fields-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("persons-fields-list: calls GET /persons/fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 125, name: "Use Case" }] }]);
  await personsFieldsList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/persons/fields");
});
