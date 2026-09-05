import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/client-create.ts";

Deno.test("client-create: POSTs /admin/clients with the given fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Jane" } }], { display: TEST_DISPLAY });
  await action.execute({ name: "Jane", email: "jane@example.com", phone: "+15551234" }, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/clients");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Jane");
  assertEquals(body.email, "jane@example.com");
  assertEquals(body.phone, "+15551234");
});

Deno.test("client-create: maps countryId/stateId to the vendor's snake_case keys", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: TEST_DISPLAY });
  await action.execute({ name: "Jane", countryId: "US", stateId: 5 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.country_id, "US");
  assertEquals(body.state_id, 5);
});
