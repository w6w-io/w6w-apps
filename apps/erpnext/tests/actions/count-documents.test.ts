import { assertEquals } from "@std/assert";
import countDocuments from "../../actions/count-documents.ts";
import { mockCtx } from "../_helpers.ts";

const conn = { display: { baseUrl: "https://erpnext.example.com" } };

Deno.test("count-documents: calls frappe.client.get_count with doctype and filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: 7 } }], conn);
  const result = await countDocuments.execute(
    { doctype: "Sales Order", filters: '[["status","=","Draft"]]' },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/method/frappe.client.get_count");
  assertEquals(url.searchParams.get("doctype"), "Sales Order");
  assertEquals(url.searchParams.get("filters"), '[["status","=","Draft"]]');
  assertEquals(result, { count: 7 });
});

Deno.test("count-documents: no filters means no filters param sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: 0 } }], conn);
  await countDocuments.execute({ doctype: "Lead" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("filters"), false);
});

Deno.test("count-documents: is declared read, since it never mutates", () => {
  assertEquals(countDocuments.type, "read");
});
