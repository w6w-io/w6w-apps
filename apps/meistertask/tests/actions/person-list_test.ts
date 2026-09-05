import { assertEquals } from "@std/assert";
import personList from "../../actions/person-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("person-list: GET /persons", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 8, firstname: "Jane" }] }]);
  const out = await personList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/persons");
  assertEquals(out, [{ id: 8, firstname: "Jane" }]);
});
