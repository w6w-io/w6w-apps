import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/customer-find-by-email.ts";

Deno.test("customer-find-by-email: GETs /customers/email={email}", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "1" } } }]);
  const out = await action.execute({ email: "jane@example.com" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.api.kustomerapp.com/v1/customers/email=jane%40example.com",
  );
  assertEquals(out, { id: "1" });
});
