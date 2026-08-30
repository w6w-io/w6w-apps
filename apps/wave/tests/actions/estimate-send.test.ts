import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import estimateSend from "../../actions/estimate-send.ts";

Deno.test("estimate-send: splits a comma-separated `to` into a list and defaults attachPDF", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { estimateSend: { didSucceed: true, inputErrors: [] } } },
  }]);
  const out = await estimateSend.execute(
    { estimateId: "est1", to: "a@example.com, b@example.com" },
    ctx,
  ) as { didSucceed: boolean };
  assertEquals(out.didSucceed, true);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.input.to, ["a@example.com", "b@example.com"]);
  assertEquals(body.variables.input.attachPDF, true);
});

Deno.test("estimate-send: a rejected send throws", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        estimateSend: {
          didSucceed: false,
          inputErrors: [{ code: "INVALID", message: "Bad recipient.", path: ["input", "to"] }],
        },
      },
    },
  }]);
  let threw = false;
  try {
    await estimateSend.execute({ estimateId: "est1", to: "not-an-email" }, ctx);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("expected a rejection");
});

Deno.test("estimate-send: type/resource/idempotency metadata", () => {
  assertEquals(estimateSend.type, "perform");
  assertEquals(estimateSend.resource, "estimate");
  assertEquals(estimateSend.idempotent, false);
});
