import { assertEquals } from "@std/assert";
import callroutersCreate from "../../actions/callrouters-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("callrouters-create: POSTs /callrouters and strips the response signing secret", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      id: "1",
      name: "Router",
      signature: { algo: "HS256", secret: "generated-secret", type: "jwt" },
    },
  }]);
  const out = await callroutersCreate.execute(
    {
      name: "Router",
      officeId: "5",
      routingUrl: "https://example.com/route",
      defaultTargetId: "9",
      defaultTargetType: "user",
    },
    ctx,
  ) as { signature: { secret?: string; algo?: string } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/callrouters");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.office_id, 5);
  assertEquals(body.default_target_id, 9);
  assertEquals(body.default_target_type, "user");
  assertEquals(out.signature.secret, undefined);
  assertEquals(out.signature.algo, "HS256");
});

Deno.test("callrouters-create: declared non-idempotent", () => {
  assertEquals(callroutersCreate.idempotent, false);
});
