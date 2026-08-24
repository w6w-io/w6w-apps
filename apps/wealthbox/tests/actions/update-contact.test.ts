import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-contact.ts";

Deno.test("update-contact: is an idempotent perform, and only contactId is required", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  const required = (action.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["contactId"]);
});

Deno.test("update-contact: PUTs /contacts/{id} with only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute({ contactId: 1, jobTitle: "CTO" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/v1/contacts/1");
  assertEquals(JSON.parse(calls[0].body!), { job_title: "CTO" });
});

Deno.test("update-contact: never sends fields the caller omitted, even as null", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ contactId: 1, nickname: "Kev" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(!("first_name" in sent));
  assert(!("last_name" in sent));
  assertEquals(sent, { nickname: "Kev" });
});

Deno.test("update-contact: merges additionalProperties", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ contactId: 1, additionalProperties: { marital_status: "Married" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).marital_status, "Married");
});
