import { assert, assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/** The vendor's own schema example, key and all. */
const USER = {
  user_id: "1234567890",
  xi_api_key: "8so27l7327189x0h939ekx293380l920",
  xi_api_key_preview: "8so2…l920",
  is_api_key_hashed: false,
  first_name: "John",
  seat_type: "workspace_member",
  created_at: 1753999199,
  subscription: { tier: "trial", character_count: 17231 },
};

/**
 * THE reason this action is not a pass-through. `GET /v1/user` returns
 * `xi_api_key` — "The API key of the user" — in full, and an action result is
 * persisted in the run record.
 */
Deno.test("user-get: the caller's own API key never leaves the action", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  const out = await userGet.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/user");
  assertEquals("xi_api_key" in out, false, "the live key was returned to the workflow");
  assert(!JSON.stringify(out).includes("8so27l7327189x0h939ekx293380l920"));
});

/**
 * The masked preview is deliberately KEPT: it answers "which key is this
 * connection using?" without handing the key over. Dropping it would make the
 * redaction cost something it does not need to cost.
 */
Deno.test("user-get: the vendor's masked preview and every other field survive", async () => {
  const { ctx } = mockCtx([{ body: USER }]);
  const out = await userGet.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.xi_api_key_preview, "8so2…l920");
  assertEquals(out.is_api_key_hashed, false);
  assertEquals(out.user_id, "1234567890");
  assertEquals(out.first_name, "John");
  assertEquals(out.seat_type, "workspace_member");
  assertEquals(out.subscription, { tier: "trial", character_count: 17231 });
});

Deno.test("user-get: takes no parameters", () => {
  assertEquals(userGet.params, []);
  assertEquals(userGet.type, "read");
});
