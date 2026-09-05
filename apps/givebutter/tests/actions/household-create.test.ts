import { assertEquals } from "@std/assert";
import householdCreate from "../../actions/household-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("household-create: POSTs to /households", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1, name: "The Smiths" }) }]);
  await householdCreate.execute({ name: "The Smiths", head_contact_id: 42 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/households");
  assertEquals(JSON.parse(calls[0].body!), { name: "The Smiths", head_contact_id: 42 });
});
