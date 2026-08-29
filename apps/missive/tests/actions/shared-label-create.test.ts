import { assertEquals } from "@std/assert";
import action from "../../actions/shared-label-create.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("shared-label-create: posts name/organization/color", async () => {
  const { ctx, calls } = mockCtx([
    { body: { shared_labels: [{ id: "l1", name: "Heroku" }] } },
  ]);
  const out = await action.execute(
    { name: "Heroku", organization: "org-1", color: "#430098", shareWithUsers: "u1,u2" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/shared_labels");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.shared_labels[0].share_with_users, ["u1", "u2"]);
  assertEquals(out, { id: "l1", name: "Heroku" });
});

Deno.test("shared-label-create: requires name and organization", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ name: "", organization: "org-1" }, ctx));
  await assertActionRejects(() => action.execute({ name: "Heroku", organization: "" }, ctx));
});
