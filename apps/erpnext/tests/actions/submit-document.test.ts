import { assert, assertEquals, assertRejects } from "@std/assert";
import submitDocument from "../../actions/submit-document.ts";
import { mockCtx } from "../_helpers.ts";

const conn = { display: { baseUrl: "https://erpnext.example.com" } };

Deno.test("submit-document: POSTs the whole document to frappe.client.submit", async () => {
  const doc = { doctype: "Sales Order", name: "SAL-ORD-2026-00042", grand_total: 100 };
  const { ctx, calls } = mockCtx([
    { status: 200, body: { message: { ...doc, docstatus: 1 } } },
  ], conn);
  const result = await submitDocument.execute({ document: doc }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/method/frappe.client.submit");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { doc });
  assertEquals(result, { document: { ...doc, docstatus: 1 } });
});

Deno.test("submit-document: accepts Document as a raw JSON string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: {} } }], conn);
  await submitDocument.execute({ document: '{"doctype":"Sales Order","name":"SO-1"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { doc: { doctype: "Sales Order", name: "SO-1" } });
});

Deno.test("submit-document: refuses a non-object Document", async () => {
  const { ctx } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await submitDocument.execute({ document: "5" }, ctx),
    Error,
  );
  assert(err.message.includes("must be a JSON object"), err.message);
});

Deno.test("submit-document: an already-submitted document cannot be submitted again", () => {
  assertEquals(submitDocument.idempotent, false);
});
