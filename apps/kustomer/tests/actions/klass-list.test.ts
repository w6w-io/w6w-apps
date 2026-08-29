import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/klass-list.ts";

Deno.test("klass-list: GETs /klasses with the optional filters", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: [], meta: { page: 1 } } }]);
  const out = await action.execute({ name: "order", status: "enabled", page: 1 }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.api.kustomerapp.com/v1/klasses?page=1&name=order&status=enabled",
  );
  assertEquals(out, { data: [], meta: { page: 1 } });
});
