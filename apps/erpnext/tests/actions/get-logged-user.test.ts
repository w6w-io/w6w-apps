import { assertEquals } from "@std/assert";
import getLoggedUser from "../../actions/get-logged-user.ts";
import { mockCtx } from "../_helpers.ts";

const conn = { display: { baseUrl: "https://erpnext.example.com" } };

Deno.test("get-logged-user: reads frappe.auth.get_logged_user and unwraps message", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: "bot@example.com" } }], conn);
  const result = await getLoggedUser.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/method/frappe.auth.get_logged_user");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { user: "bot@example.com" });
});

Deno.test("get-logged-user: does not require an Authorization header itself — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: "bot@example.com" } }], conn);
  await getLoggedUser.execute({}, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
