import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    const { jobTitle, industry, seniority, jobDesc, tasks } = body;

    if (!jobDesc) {
      return NextResponse.json(
        { error: "Job description required." },
        { status: 400 }
      );
    }

    if (!tasks || tasks.length < 3 || tasks.length > 8) {
      return NextResponse.json(
        { error: "Select between 3 and 8 tasks." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "API route working correctly.",
      received: {
        jobTitle,
        industry,
        seniority,
        tasksCount: tasks.length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Server error." },
      { status: 500 }
    );
  }
}
