import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/data-replace.ts";

const display = { baseUrl: "https://myapp.bubbleapps.io" };

Deno.test("data-replace: PUTs the full field set", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display });

  const out = await action.execute({
    type: "thing",
    uniqueId: "1x1",
    fields: { name: "only field" },
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "only field" });
  assertEquals(out, { ok: true });
});

Deno.test("data-replace: warns, in its own description, that omitted fields are cleared", () => {
  const doc = action.description ?? "";
  const hint = (action.params!.find((p) => p.key === "fields") as { hint?: string }).hint ?? "";
  const text = doc + hint;
  const mentionsClearing = /clear|reset/i.test(text);
  if (!mentionsClearing) {
    throw new Error("data-replace must document that PUT clears omitted fields");
  }
});
