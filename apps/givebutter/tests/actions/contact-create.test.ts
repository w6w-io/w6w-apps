import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs to /contacts with plain string-array emails/phones/tags", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await contactCreate.execute(
    { first_name: "Ada", last_name: "Lovelace", emails: "a@x.com, b@x.com", tags: "vip" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.first_name, "Ada");
  assertEquals(body.emails, ["a@x.com", "b@x.com"]);
  assertEquals(body.tags, ["vip"]);
});

Deno.test("contact-create: addresses JSON is parsed into an object array", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await contactCreate.execute(
    { company_name: "Acme", addresses: '[{"city":"NYC"}]' },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.addresses, [{ city: "NYC" }]);
});
