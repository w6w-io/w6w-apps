import { assertEquals } from "@std/assert";
import action from "../../actions/organization-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("organization-list: lists organizations", async () => {
  const { ctx, calls } = mockCtx([{ body: { organizations: [{ id: "o1", name: "Acme" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/organizations");
  assertEquals(out, [{ id: "o1", name: "Acme" }]);
});
