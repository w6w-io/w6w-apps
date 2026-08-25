import { assertEquals } from "@std/assert";
import verifiedContactList from "../../actions/verified-contact-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("verified-contact-list: GETs /v3/verified-contacts with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { contacts: [], line: {} } } }]);
  await verifiedContactList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/verified-contacts");
});
