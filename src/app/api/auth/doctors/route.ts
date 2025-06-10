import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { doctorsTable } from "@/db/schema";

export async function GET() {
  try {
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
      })
      .from(doctorsTable)
      .where(eq(doctorsTable.is_active, true));

    return NextResponse.json(doctors);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json(
      { error: "Erro ao buscar médicos" },
      { status: 500 },
    );
  }
}
