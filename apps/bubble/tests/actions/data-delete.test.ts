import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/data-delete.ts";

const display = { baseUrl: "https://myapp.bubbleapps.io" };

Deno.test("data-delete: refuses to run without confirm: true", async () => {
  const { ctx, calls } = mockCtx([], { display });
  let threw = false;
  try {
    await action.execute({ type: "thing", uniqueId: "1x1", confirm: false }, ctx);
  } catch {
    threw = true;
  }
  assert(threw, "data-delete must refuse without confirmation");
  assertEquals(calls.length, 0, "no request should be made without confirmation");
});

Deno.test("data-delete: DELETEs the record when confirmed", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display });
  const out = await action.execute({ type: "thing", uniqueId: "1x1", confirm: true }, ctx);
  assertEquals(calls[0].url, "https://myapp.bubbleapps.io/api/1.1/obj/thing/1x1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { ok: true });
});

Deno.test("data-delete: the confirm param is required", () => {
  const confirm = action.params!.find((p) => p.key === "confirm") as { required?: boolean };
  assertEquals(confirm.required, true);
});
