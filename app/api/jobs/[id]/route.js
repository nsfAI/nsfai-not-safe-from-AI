import client from "../../../../lib/opensearch";

const INDEX = "jobs_v1";

export async function GET(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return Response.json(
        { ok: false, error: "Missing job id" },
        { status: 400 }
      );
    }

    const resp = await client.get({
      index: INDEX,
      id,
    });

    const src = resp?.body?._source || resp?._source;

    if (!src) {
      return Response.json(
        { ok: false, error: "Job not found" },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      job: {
        id,
        ...src,
      },
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err?.meta?.body?.error?.reason || err?.message || "Unknown error",
      },
      { status: 200 }
    );
  }
}
