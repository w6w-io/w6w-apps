import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-list: hits GET /v2.1/contacts", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  const out = await contactList.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2.1/contacts");
  assertEquals(out.data, [{ id: 1 }]);
});
