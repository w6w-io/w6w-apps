import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { envelope, mockWrikeCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-update: PUTs to /contacts/{contactId} with a JSON-encoded metadata array", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "U1", firstName: "A", lastName: "B" }]) },
  ]);
  await contactUpdate.execute(
    { contactId: "U1", metadata: [{ key: "k", value: "v" }] },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v4/contacts/U1");
  assertEquals(queryOf(calls[0].url).metadata, '[{"key":"k","value":"v"}]');
});

Deno.test("contact-update: the own-contact-only scoping limit is documented on the action", () => {
  assertEquals(contactUpdate.description?.includes("requesting user"), true);
});
