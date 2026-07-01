import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-update-profile.ts";

Deno.test("user-update-profile: nests fields under `profile` and sets status_expiration=0 by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, profile: { first_name: "CJ" } } }]);
  const result = await action.execute!({ firstName: "CJ", statusText: "away" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/users.profile.set");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.profile.first_name, "CJ");
  assertEquals(body.profile.status_text, "away");
  assertEquals(body.profile.status_expiration, 0);
  assertEquals(result, { first_name: "CJ" });
});

Deno.test("user-update-profile: converts customFields[] into a keyed fields map", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, profile: {} } }]);
  await action.execute!(
    {
      customFields: [
        { id: "Xf01", value: "hello", alt: "greeting" },
        { id: "Xf02", value: "world" },
      ],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.profile.fields, {
    Xf01: { value: "hello", alt: "greeting" },
    Xf02: { value: "world" },
  });
});
