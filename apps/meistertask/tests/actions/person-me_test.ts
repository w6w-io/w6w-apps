import { assertEquals } from "@std/assert";
import personMe from "../../actions/person-me.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("person-me: GET /persons/me", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 8, email: "jane@example.com" } }]);
  const out = await personMe.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/persons/me");
  assertEquals(out, { id: 8, email: "jane@example.com" });
});
