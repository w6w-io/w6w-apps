import { assert, assertEquals, assertRejects } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { bodyOf, entityBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs /v1/contacts with structured channels", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: entityBody("contact", { id: 719 }) }]);
  const out = await contactCreate.execute({
    firstName: "Gary",
    lastName: "Jennings",
    information: "external_custom_id:87123",
    phoneNumbers: [{ label: "Work", value: "+19001112222" }],
    emails: [{ label: "Office", value: "gary@acme.com" }],
  }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(bodyOf(calls[0]), {
    first_name: "Gary",
    last_name: "Jennings",
    information: "external_custom_id:87123",
    phone_numbers: [{ label: "Work", value: "+19001112222" }],
    emails: [{ label: "Office", value: "gary@acme.com" }],
  });
  assertEquals(out.id, 719);
});

Deno.test("contact-create: a JSON string of channels is parsed", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: entityBody("contact", {}) }]);
  await contactCreate.execute({
    phoneNumbers: JSON.stringify([{ label: "Work", value: "+19001112222" }]),
  }, ctx);
  assertEquals(bodyOf(calls[0]).phone_numbers, [{ label: "Work", value: "+19001112222" }]);
});

/** `phone_numbers` is mandatory, and each entry needs BOTH halves. */
Deno.test("contact-create: no phone number is rejected before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(contactCreate.execute({ phoneNumbers: [] }, ctx)),
    Error,
  );
  assert(err.message.includes("at least one phone number"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("contact-create: a channel missing its label names the offending row", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        contactCreate.execute({
          phoneNumbers: [{ label: "Work", value: "+1900" }, { value: "+1901" }],
        }, ctx),
      ),
    Error,
  );
  assert(err.message.includes("[1]"), `the message must name the row: ${err.message}`);
  assertEquals(calls.length, 0);
});

Deno.test("contact-create: an empty emails list is omitted rather than sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: entityBody("contact", {}) }]);
  await contactCreate.execute({ phoneNumbers: [{ label: "Work", value: "+1900" }] }, ctx);
  assert(!("emails" in bodyOf(calls[0])), JSON.stringify(bodyOf(calls[0])));
});
