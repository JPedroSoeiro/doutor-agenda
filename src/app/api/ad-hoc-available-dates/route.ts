"use server";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { adHocAvailableDatesTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");

    if (!doctorId) {
      return NextResponse.json(
        { message: "Parâmetro doctorId é obrigatório." },
        { status: 400 },
      );
    }

    const adHocDates = await db
      .select({
        date: adHocAvailableDatesTable.date,
      })
      .from(adHocAvailableDatesTable)
      .where(eq(adHocAvailableDatesTable.doctorId, doctorId));

    return NextResponse.json(
      adHocDates.map((bd) => bd.date.toISOString().split("T")[0]),
    );
  } catch (error) {
    console.error(
      "Erro ao carregar datas de disponibilidade ad-hoc na API:",
      error,
    );
    return NextResponse.json(
      { message: "Erro interno do servidor ao carregar datas ad-hoc." },
      { status: 500 },
    );
  }
}
