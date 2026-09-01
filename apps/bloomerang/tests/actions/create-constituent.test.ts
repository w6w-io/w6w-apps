import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-constituent.ts";

Deno.test("create-constituent: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

Deno.test("create-constituent: POSTs /constituent with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 1 } }]);
  await action.execute({
    type: "Individual",
    firstName: "Bob",
    lastName: "Smith",
    status: "Active",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v2/constituent");
  assertEquals(JSON.parse(calls[0].body!), {
    Type: "Individual",
    Status: "Active",
    FirstName: "Bob",
    LastName: "Smith",
  });
});

Deno.test("create-constituent: nests PrimaryEmail and PrimaryPhone when supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 1 } }]);
  await action.execute({
    type: "Organization",
    fullName: "Bluth Company",
    primaryEmail: "info@bluth.example",
    primaryPhone: "555-0100",
    primaryPhoneType: "Work",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.PrimaryEmail, { Type: "Home", Value: "info@bluth.example" });
  assertEquals(sent.PrimaryPhone, { Type: "Work", Number: "555-0100" });
});

Deno.test("create-constituent: omits every field the caller did not supply", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ type: "Individual" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { Type: "Individual" });
});
