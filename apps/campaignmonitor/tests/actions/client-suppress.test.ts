import { assertEquals, assertRejects } from "@std/assert";
import clientSuppress from "../../actions/client-suppress.ts";
import { API_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client-suppress: POSTs the addresses under EmailAddresses", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await clientSuppress.execute(
    { clientId: "cid", emailAddresses: ["a@example.com", "b@example.com"] },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/clients/cid/suppress.json`);
  assertEquals(bodyOf(calls[0]), { EmailAddresses: ["a@example.com", "b@example.com"] });
  // The endpoint answers a bare 200 with no body, so the count is all there is.
  assertEquals(out, { suppressed: 2 });
});

Deno.test("client-suppress: accepts the JSON param as a typed string too", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await clientSuppress.execute({ clientId: "cid", emailAddresses: '["a@example.com"]' }, ctx);
  assertEquals(bodyOf(calls[0]), { EmailAddresses: ["a@example.com"] });
});

Deno.test("client-suppress: refuses an empty batch before spending a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await clientSuppress.execute({ clientId: "cid", emailAddresses: [] }, ctx),
    Error,
    "non-empty",
  );
  assertEquals(calls.length, 0);
});

Deno.test("client-suppress: is declared idempotent — suppressing twice is one end state", () => {
  assertEquals(clientSuppress.idempotent, true);
});
