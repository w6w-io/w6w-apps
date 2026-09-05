import { assertEquals } from "@std/assert";
import getDocument from "../../actions/get-document.ts";
import { mockCtx } from "../_helpers.ts";

const conn = { display: { baseUrl: "https://erpnext.example.com" } };

Deno.test("get-document: reads by doctype and name", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: { name: "CUST-0001", customer_name: "Acme" } } },
  ], conn);
  const result = await getDocument.execute({ doctype: "Customer", name: "CUST-0001" }, ctx);
  assertEquals(calls[0].url, "https://erpnext.example.com/api/resource/Customer/CUST-0001");
  assertEquals(result, { document: { name: "CUST-0001", customer_name: "Acme" } });
});

Deno.test("get-document: expandLinks sends expand_links=True", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], conn);
  await getDocument.execute({ doctype: "Customer", name: "CUST-0001", expandLinks: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("expand_links"), "True");
});

Deno.test("get-document: expandLinks off sends no query at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], conn);
  await getDocument.execute({ doctype: "Customer", name: "CUST-0001" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("get-document: a name with special characters is encoded", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], conn);
  await getDocument.execute({ doctype: "ToDo", name: "abc/def" }, ctx);
  assertEquals(calls[0].url, "https://erpnext.example.com/api/resource/ToDo/abc%2Fdef");
});
