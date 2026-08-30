import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("contact-create: POSTs to /contacts/new", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { contact: { id: 1 } } }], conn);
  await action.execute!({ email: "jim@example.com", firstname: "Jim" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://mautic.example.com/api/contacts/new");
  assertEquals(JSON.parse(calls[0].body!), { email: "jim@example.com", firstname: "Jim" });
});

Deno.test("contact-create: tags become an array and ownerId=0 is omitted", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { contact: {} } }], conn);
  await action.execute!({ email: "a@b.com", tags: "vip, lead", ownerId: 0 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tags, ["vip", "lead"]);
  assertEquals(body.owner, undefined);
});

Deno.test("contact-create: otherFields merges arbitrary field aliases", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { contact: {} } }], conn);
  await action.execute!({ otherFields: '{"city": "Austin"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).city, "Austin");
});

Deno.test("contact-create: idempotent is false — two calls create two contacts", () => {
  assertEquals(action.idempotent, false);
});
