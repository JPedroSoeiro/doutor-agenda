// src/app/api/blocked-dates/route.ts
"use server";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { blockedDatesTable } from "@/db/schema";
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

    const blockedDates = await db
      .select({
        date: blockedDatesTable.date,
      })
      .from(blockedDatesTable)
      .where(eq(blockedDatesTable.doctorId, doctorId));

    // Retorna as datas bloqueadas (formato YYYY-MM-DD)
    return NextResponse.json(
      blockedDates.map((bd) => bd.date.toISOString().split("T")[0]),
    );
  } catch (error) {
    console.error("Erro ao carregar datas bloqueadas na API:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor ao carregar datas bloqueadas." },
      { status: 500 },
    );
  }
}
