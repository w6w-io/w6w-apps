import { assertEquals } from "@std/assert";
import callMethod from "../../actions/call-method.ts";
import { mockCtx } from "../_helpers.ts";

const conn = { display: { baseUrl: "https://erpnext.example.com" } };

Deno.test("call-method: GET sends arguments as query params, no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: 3 } }], conn);
  const result = await callMethod.execute({
    method: "frappe.client.get_count",
    httpMethod: "GET",
    args: { doctype: "Customer" },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/method/frappe.client.get_count");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("doctype"), "Customer");
  assertEquals(calls[0].body, null);
  assertEquals(result, { result: 3 });
});

Deno.test("call-method: POST sends arguments as a JSON body, no query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: { ok: true } } }], conn);
  await callMethod.execute({
    method: "frappe.client.rename_doc",
    httpMethod: "POST",
    args: { doctype: "ToDo", old_name: "a", new_name: "b" },
  }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { doctype: "ToDo", old_name: "a", new_name: "b" });
});

Deno.test("call-method: defaults httpMethod to GET for anything else supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: null } }], conn);
  await callMethod.execute(
    { method: "frappe.auth.get_logged_user", httpMethod: "PATCH" as never },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
});

Deno.test("call-method: refuses a non-object Arguments", async () => {
  const { ctx } = mockCtx([], conn);
  let threw = false;
  try {
    await callMethod.execute({ method: "x", httpMethod: "GET", args: "[1]" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("call-method: the method chosen at runtime cannot be promised safe to retry", () => {
  assertEquals(callMethod.idempotent, false);
});
