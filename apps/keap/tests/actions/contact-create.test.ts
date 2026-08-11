import { assertEquals, assertRejects } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const CREATED = { id: "1001", given_name: "Jo" };

Deno.test("contact-create: POSTs the contact with the email in a slot-shaped array", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await contactCreate.execute({ givenName: "Jo", email: "jo@x.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/contacts");
  assertEquals(JSON.parse(calls[0].body!), {
    given_name: "Jo",
    // Three fixed slots, not a free list.
    email_addresses: [{ email: "jo@x.com", field: "EMAIL1" }],
  });
});

Deno.test("contact-create: honours a non-default email and phone slot", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await contactCreate.execute(
    { email: "jo@x.com", emailField: "EMAIL2", phone: "555", phoneField: "PHONE3" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email_addresses[0].field, "EMAIL2");
  assertEquals(body.phone_numbers[0].field, "PHONE3");
});

/**
 * Keap: "Contact must contain at least one item in `email_addresses`,
 * `phone_numbers`, or `addresses`." The server-side failure is a bare 400.
 */
Deno.test("contact-create: refuses a contact with no way to reach it, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactCreate.execute({ givenName: "Jo" }, ctx),
    Error,
    "at least one email address, phone number or address",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-create: an address alone satisfies the requirement", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await contactCreate.execute(
    { addresses: [{ field: "BILLING", line1: "1 Main St", country_code: "USA" }] },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).addresses.length, 1);
});

/**
 * The single most consequential parameter here: with it the endpoint is an
 * upsert, without it every run creates another contact.
 */
Deno.test("contact-create: duplicate_option is absent by default and sent when chosen", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }, { status: 200, body: CREATED }]);
  await contactCreate.execute({ email: "jo@x.com" }, ctx);
  assertEquals(queryOf(calls[0].url).duplicate_option, undefined);
  await contactCreate.execute({ email: "jo@x.com", duplicateOption: "EmailAndName" }, ctx);
  assertEquals(queryOf(calls[1].url).duplicate_option, "EmailAndName");
});

Deno.test("contact-create: is declared non-idempotent, because the default behaviour is not", () => {
  assertEquals(contactCreate.idempotent, false);
});

Deno.test("contact-create: extra properties are merged into the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await contactCreate.execute(
    { email: "jo@x.com", extra: '{"birth_date":"1985-03-15","time_zone":"UTC"}' },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.birth_date, "1985-03-15");
  assertEquals(body.time_zone, "UTC");
});

Deno.test("contact-create: malformed JSON fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactCreate.execute({ email: "a@b.com", customFields: "{not json" }, ctx),
    Error,
    "Custom fields is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-create: a company is sent as a nested reference", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await contactCreate.execute({ email: "a@b.com", companyId: "77" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).company, { id: "77" });
});
