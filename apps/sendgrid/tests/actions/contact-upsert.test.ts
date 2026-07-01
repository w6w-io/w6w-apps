import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-upsert.ts";

Deno.test("contact-upsert: minimal PUT /marketing/contacts with email only", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { job_id: "j-1" } }]);
  const result = await action.execute!({ email: "a@x.com" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.sendgrid.com/v3/marketing/contacts");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body, { contacts: [{ email: "a@x.com" }] });
  assertEquals(result, { job_id: "j-1" });
});

Deno.test("contact-upsert: maps additionalFields to snake_case contact fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  await action.execute!(
    {
      email: "a@x.com",
      additionalFields: {
        firstName: "Alice",
        lastName: "Smith",
        city: "NYC",
        country: "US",
        postalCode: "10001",
        stateProvinceRegion: "NY",
        addressUi: { address1: "1 Main St", address2: "Apt 2" },
        alternateEmails: "alt1@x.com, alt2@x.com",
        listIds: ["list-a", "list-b"],
        customFields: { fieldId: "cf1", fieldValue: "hello" },
      },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.list_ids, ["list-a", "list-b"]);
  assertEquals(body.contacts[0].first_name, "Alice");
  assertEquals(body.contacts[0].last_name, "Smith");
  assertEquals(body.contacts[0].city, "NYC");
  assertEquals(body.contacts[0].country, "US");
  assertEquals(body.contacts[0].postal_code, "10001");
  assertEquals(body.contacts[0].state_province_region, "NY");
  assertEquals(body.contacts[0].address_line_1, "1 Main St");
  assertEquals(body.contacts[0].address_line_2, "Apt 2");
  assertEquals(body.contacts[0].alternate_emails, ["alt1@x.com", "alt2@x.com"]);
  assertEquals(body.contacts[0].custom_fields, { cf1: "hello" });
});

Deno.test("contact-upsert: missing email rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ email: "" }, ctx),
    Error,
    "`email`",
  );
});
