import { assertEquals } from "@std/assert";
import organizationsFieldsList from "../../actions/organizations-fields-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("organizations-fields-list: calls GET /organizations/fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 662, name: "Potential Users" }] }]);
  await organizationsFieldsList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/organizations/fields");
});
