import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { envelope, mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: joins ids into the path", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([{ id: "U1" }]) }]);
  await contactGet.execute({ contactIds: ["U1", "U2"] }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/contacts/U1,U2");
});
