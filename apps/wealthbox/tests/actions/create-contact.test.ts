import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-contact.ts";

Deno.test("create-contact: is a non-idempotent perform requiring first/last name", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  const keys = (action.params ?? []).filter((p) => p.required).map((p) => p.key);
  assert(keys.includes("firstName"));
  assert(keys.includes("lastName"));
});

Deno.test("create-contact: POSTs /contacts with the mapped snake_case body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute({
    firstName: "Kevin",
    lastName: "Anderson",
    jobTitle: "CEO",
    companyName: "Acme Co.",
    type: "Person",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/contacts");
  assertEquals(JSON.parse(calls[0].body!), {
    first_name: "Kevin",
    last_name: "Anderson",
    job_title: "CEO",
    company_name: "Acme Co.",
    type: "Person",
  });
});

Deno.test("create-contact: omits every field the caller did not supply", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ firstName: "Kevin", lastName: "Anderson" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { first_name: "Kevin", last_name: "Anderson" });
});

Deno.test("create-contact: merges additionalProperties for fields not exposed directly", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({
    firstName: "Kevin",
    lastName: "Anderson",
    additionalProperties: { gender: "Male", risk_tolerance: "Moderate" },
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.gender, "Male");
  assertEquals(sent.risk_tolerance, "Moderate");
});

Deno.test("create-contact: passes nested email/phone/street address arrays through as given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const emailAddresses = [{ address: "kevin@example.com", principal: true, kind: "Work" }];
  await action.execute({ firstName: "K", lastName: "A", emailAddresses }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.email_addresses, emailAddresses);
});
