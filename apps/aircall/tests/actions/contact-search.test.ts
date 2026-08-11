import { assertEquals } from "@std/assert";
import contactSearch from "../../actions/contact-search.ts";
import { listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-search: reads GET /v1/contacts/search by phone number", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("contacts", [{ id: 711 }]) }]);
  await contactSearch.execute({ phoneNumber: "+34664673697" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/contacts/search");
  assertEquals(queryOf(calls[0].url).phone_number, "+34664673697");
});

Deno.test("contact-search: searches by email", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("contacts", []) }]);
  await contactSearch.execute({ email: "gary@acme.com" }, ctx);
  assertEquals(queryOf(calls[0].url).email, "gary@acme.com");
});
