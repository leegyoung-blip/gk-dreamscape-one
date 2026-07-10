import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!process.env.DREAMSCAPE_TEST_PASSWORD) {
      return NextResponse.json(
        { error: "Missing DREAMSCAPE_TEST_PASSWORD." },
        { status: 500 }
      );
    }

    if (password !== process.env.DREAMSCAPE_TEST_PASSWORD) {
      return NextResponse.json(
        { error: "Incorrect password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("dreamscape_test_access", "granted", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Could not verify password." },
      { status: 500 }
    );
  }
}