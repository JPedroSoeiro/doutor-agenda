import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { doctorsTable } from "@/db/schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json(
        { message: "Parâmetro clinicId é obrigatório para buscar médicos." },
        { status: 400 },
      );
    }

    const doctors = await db
      .select({
        id: doctorsTable.id,
        name: doctorsTable.name,
        specialty: doctorsTable.specialty,
        availableFromWeekDay: doctorsTable.availableFromWeekDay,
        availableToWeekDay: doctorsTable.availableToWeekDay,
        availableFromTime: doctorsTable.availableFromTime,
        availableToTime: doctorsTable.availableToTime,
        appointmentPriceInCents: doctorsTable.appointmentPriceInCents,
        is_active: doctorsTable.is_active,
      })
      .from(doctorsTable)
      .where(eq(doctorsTable.clinicId, clinicId));

    return NextResponse.json(doctors);
  } catch (error) {
    console.error("Erro ao carregar médicos na API:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor ao carregar médicos." },
      { status: 500 },
    );
  }
}
