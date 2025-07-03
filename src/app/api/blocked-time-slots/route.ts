// src/app/api/blocked-time-slots/route.ts
import { db } from "@/db";
import { blockedTimeSlotsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const APP_TIMEZONE = "America/Fortaleza";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId");
  const clinicId = searchParams.get("clinicId");
  const dateString = searchParams.get("date");

  if (!doctorId || !clinicId || !dateString) {
    return NextResponse.json(
      { error: "IDs de médico, clínica e data são obrigatórios." },
      { status: 400 },
    );
  }

  try {
    const targetDate = dayjs
      .tz(dateString, APP_TIMEZONE)
      .startOf("day")
      .toDate();

    const blockedTimes = await db
      .select({ time: blockedTimeSlotsTable.time })
      .from(blockedTimeSlotsTable)
      .where(
        and(
          eq(blockedTimeSlotsTable.doctorId, doctorId),
          eq(blockedTimeSlotsTable.clinicId, clinicId),
          eq(blockedTimeSlotsTable.date, targetDate),
        ),
      );

    const formattedBlockedTimes = blockedTimes.map((row) => row.time);

    return NextResponse.json({
      blockedTimes: formattedBlockedTimes,
    });
  } catch (error) {
    console.error("Erro ao buscar horários bloqueados:", error);
    return NextResponse.json(
      { error: "Erro ao buscar horários de agendamento." },
      { status: 500 },
    );
  }
}
