import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PUTs to /v2/contacts/:id with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 2, customer_status: "current" }) }]);
  await contactUpdate.execute({
    id: 2,
    customerStatus: "current",
    tags: "contractor,early-adopter",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/contacts/2");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.customer_status, "current");
  assertEquals(body.data.tags, ["contractor", "early-adopter"]);
  assertEquals("name" in body.data, false);
});
