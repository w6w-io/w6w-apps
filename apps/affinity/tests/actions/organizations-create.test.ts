import { assertEquals } from "@std/assert";
import organizationsCreate from "../../actions/organizations-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("organizations-create: POSTs name/domain/person_ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 120611418, name: "Acme Corporation" } }]);
  await organizationsCreate.execute(
    { name: "Acme Corporation", domain: "acme.co", personIds: "38706" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/organizations");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Acme Corporation",
    domain: "acme.co",
    person_ids: [38706],
  });
});
