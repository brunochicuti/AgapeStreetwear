import { NextResponse } from "next/server";
import { verificarAdmin } from "@/src/lib/admin";

export async function GET() {
  const autorizado = await verificarAdmin();

  return NextResponse.json(
    { isAdmin: autorizado },
    { status: 200 }
  );
}