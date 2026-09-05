import { assertEquals } from "@std/assert";
import cancelDocument from "../../actions/cancel-document.ts";
import { mockCtx } from "../_helpers.ts";

const conn = { display: { baseUrl: "https://erpnext.example.com" } };

Deno.test("cancel-document: POSTs doctype and name (not the whole document)", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { message: { name: "SAL-ORD-2026-00042", docstatus: 2 } } },
  ], conn);
  const result = await cancelDocument.execute(
    { doctype: "Sales Order", name: "SAL-ORD-2026-00042" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/method/frappe.client.cancel");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    doctype: "Sales Order",
    name: "SAL-ORD-2026-00042",
  });
  assertEquals(result, { document: { name: "SAL-ORD-2026-00042", docstatus: 2 } });
});

Deno.test("cancel-document: an already-cancelled document cannot be cancelled again", () => {
  assertEquals(cancelDocument.idempotent, false);
});
