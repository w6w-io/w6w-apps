import { assert, assertEquals, assertRejects } from "@std/assert";
import userCreate from "../../actions/user-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/** Create nests under `user`; update does not. Getting it wrong changes nothing. */
Deno.test("user-create: nests the fields under user and snake_cases them", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "9" } }]);
  await userCreate.execute({
    firstName: "Shawn",
    lastName: "Spencer",
    emailAddress: "shawn@psych.co",
    phoneNumber: "4025551212",
    userRole: "restricted",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/users");
  assertEquals(bodyOf(calls[0]), {
    user: {
      first_name: "Shawn",
      last_name: "Spencer",
      email_address: "shawn@psych.co",
      phone_number: "4025551212",
      user_role: "restricted",
    },
  });
});

Deno.test("user-create: refuses an empty body rather than creating an empty user", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await userCreate.execute({}, ctx),
    Error,
    "Set at least one field",
  );
  assertEquals(calls.length, 0);
});

Deno.test("user-create: the password is a secret param and the role is create-only", () => {
  const password = userCreate.params!.find((p) => p.key === "password")!;
  assertEquals(password.type, "secret");
  const role = userCreate.params!.find((p) => p.key === "userRole")!;
  assertEquals(
    (role.options as Array<{ value: string }>).map((o) => o.value),
    ["standard", "restricted"],
  );
  assert(/Create-only/.test(role.hint!), role.hint);
});
