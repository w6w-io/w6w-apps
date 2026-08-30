import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-create.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("company-create: POSTs to /companies/new using company* field aliases", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { company: { id: 1 } } }], conn);
  await action.execute!({ companyname: "Acme Corporation", companyemail: "info@acme.com" }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/companies/new");
  assertEquals(
    JSON.parse(calls[0].body!),
    { companyname: "Acme Corporation", companyemail: "info@acme.com" },
  );
});

Deno.test("company-create: companyname is required, before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assert(err.message.includes("companyname"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("company-create: is not idempotent — two calls create two companies", () => {
  assertEquals(action.idempotent, false);
});
