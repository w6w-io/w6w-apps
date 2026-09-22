import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { API_ROOT, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("user-list: calls GET /users", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "UR_1" }]) }]);
  const out = await userList.execute({}, ctx) as { elements: unknown[] };

  assertEquals(calls[0].url, `${API_ROOT}/users`);
  assertEquals(out.elements, [{ id: "UR_1" }]);
});

Deno.test("user-list: a refusal is surfaced with the vendor's own code", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: {
        meta: {
          httpStatus: "403 - Forbidden",
          error: { errorCode: "DCD_3", errorMessage: "Insufficient permissions." },
          requestId: "req-1",
        },
      },
    },
  ]);

  let message = "";
  try {
    await userList.execute({}, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(/DCD_3/.test(message), true, message);
  assertEquals(/Insufficient permissions/.test(message), true, message);
});
