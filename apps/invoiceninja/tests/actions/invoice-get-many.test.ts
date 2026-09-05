import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get-many.ts";

Deno.test("invoice-get-many: GETs /invoices scoped to a client with status and pagination", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { data: [] } }]);
  await action.execute({ clientId: "cl1", status: ["active"], page: 1, perPage: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/invoices");
  assertEquals(url.searchParams.get("client_id"), "cl1");
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.get("per_page"), "5");
});
