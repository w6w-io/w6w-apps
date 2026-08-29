import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/kobject-list.ts";

Deno.test("kobject-list: GETs /klasses/{name} with pagination and sort", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: [], meta: { page: 1 } } }]);
  const out = await action.execute({ name: "order", page: 1, sort: "-createdAt" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.api.kustomerapp.com/v1/klasses/order?page=1&sort=-createdAt",
  );
  assertEquals(out, { data: [], meta: { page: 1 } });
});
