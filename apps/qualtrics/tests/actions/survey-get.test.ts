import { assert, assertEquals } from "@std/assert";
import surveyGet from "../../actions/survey-get.ts";
import { API_ROOT, envelope, mockCtx } from "../_helpers.ts";

Deno.test("survey-get: calls GET /surveys/{id} and unwraps result", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "SV_1", name: "NPS" }) }]);
  const out = await surveyGet.execute({ surveyId: "SV_1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/surveys/SV_1`);
  assertEquals(out, { id: "SV_1", name: "NPS" });
});

Deno.test("survey-get: path-escapes the id rather than concatenating it", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "SV_1" }) }]);
  await surveyGet.execute({ surveyId: "SV_1/../users" }, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/surveys/SV_1%2F..%2Fusers`);
});

Deno.test("survey-get: a failure surfaces the vendor's own errorCode", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: {
        meta: {
          httpStatus: "404 - Not Found",
          error: { errorMessage: "The requested resource does not exist." },
          requestId: "req-1",
        },
      },
    },
  ]);

  let message = "";
  try {
    await surveyGet.execute({ surveyId: "SV_missing" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(/Qualtrics 404/.test(message), message);
  assert(/requested resource does not exist/.test(message), message);
});
