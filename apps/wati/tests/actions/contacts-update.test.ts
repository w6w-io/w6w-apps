import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contacts-update.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };

Deno.test("contacts-update: PUTs /contacts, passing `customParams` (camelCase) through verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contact_list: [] } }], conn);
  const contacts = [
    { target: "1415552671", customParams: [{ name: "age", value: "30" }] },
  ];
  await action.execute({ contacts }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://live-mt-server.wati.io/12345/api/ext/v3/contacts");
  assertEquals(JSON.parse(calls[0].body!), { contacts });
});

Deno.test("contacts-update: accepts `contacts` as a JSON string too", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contact_list: [] } }], conn);
  await action.execute({ contacts: '[{"target":"1415552671","customParams":[]}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    contacts: [{ target: "1415552671", customParams: [] }],
  });
});

Deno.test("contacts-update: is idempotent (a replace, not an append)", () => {
  assertEquals(action.idempotent, true);
});
