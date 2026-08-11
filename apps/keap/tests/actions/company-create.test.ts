import { assertEquals, assertRejects } from "@std/assert";
import companyCreate from "../../actions/company-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const CREATED = { id: "3", company_name: "Acme" };

/**
 * The company schema differs from the contact one here: `email_address`,
 * `phone_number` and `fax_number` are single objects, not the arrays a contact
 * uses.
 */
Deno.test("company-create: the email and phone are single objects, not arrays", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await companyCreate.execute({ companyName: "Acme", email: "hi@acme.com", phone: "555" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email_address, { email: "hi@acme.com" });
  assertEquals(body.phone_number, { number: "555" });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/companies");
});

/** Unlike a contact, a company has no documented minimum beyond its name. */
Deno.test("company-create: a name alone is accepted", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await companyCreate.execute({ companyName: "Acme" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { company_name: "Acme" });
});

Deno.test("company-create: extra person-shaped properties are merged in", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await companyCreate.execute(
    { companyName: "Acme", extra: '{"first_name":"Jo","job_title":"CEO"}' },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.first_name, "Jo");
  assertEquals(body.job_title, "CEO");
});

Deno.test("company-create: malformed address JSON fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await companyCreate.execute({ companyName: "Acme", address: "{oops" }, ctx),
    Error,
    "Address is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("company-create: is declared non-idempotent — Keap runs no duplicate check on companies", () => {
  assertEquals(companyCreate.idempotent, false);
});
