import { assertEquals } from "@std/assert";
import peopleGet from "../../actions/people-get.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("people-get: GETs /people/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: single("people", "p1", { email: "a@b.com" }) }]);
  const result = await peopleGet.execute({ id: "p1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/people/p1");
  assertEquals(result, { id: "p1", type: "people", attributes: { email: "a@b.com" } });
});
