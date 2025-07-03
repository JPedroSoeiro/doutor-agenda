// src/app/api/blocked-dates/route.ts
import { db } from "@/db";
import { blockedDatesTable, adHocAvailableDatesTable } from "@/db/schema"; // Corrigido adHocAvailabilityTable para adHocAvailableDatesTable
import { eq, and, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const APP_TIMEZONE = "America/Fortaleza"; // Fuso horário da sua aplicação (consistente com actions.ts)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId");
  const clinicId = searchParams.get("clinicId");

  if (!doctorId || !clinicId) {
    return NextResponse.json(
      { error: "IDs de médico e clínica são obrigatórios." },
      { status: 400 },
    );
  }

  try {
    // Definir o "hoje" no fuso horário da aplicação para filtrar datas passadas
    const now = dayjs().tz(APP_TIMEZONE);
    const todayStart = now.startOf("day").toDate(); // Início do dia atual

    // Buscar datas bloqueadas
    const blockedDates = await db
      .select({ date: blockedDatesTable.date })
      .from(blockedDatesTable)
      .where(
        and(
          eq(blockedDatesTable.doctorId, doctorId),
          eq(blockedDatesTable.clinicId, clinicId),
          sql`${blockedDatesTable.date} >= ${todayStart.toISOString()}`, // Apenas datas a partir de hoje
        ),
      );

    // Buscar datas de disponibilidade ad-hoc
    const adHocAvailableDates = await db
      .select({ date: adHocAvailableDatesTable.date }) // Corrigido adHocAvailabilityTable para adHocAvailableDatesTable
      .from(adHocAvailableDatesTable) // Corrigido adHocAvailabilityTable para adHocAvailableDatesTable
      .where(
        and(
          eq(adHocAvailableDatesTable.doctorId, doctorId), // Corrigido
          eq(adHocAvailableDatesTable.clinicId, clinicId), // Corrigido
          sql`${adHocAvailableDatesTable.date} >= ${todayStart.toISOString()}`, // Corrigido
        ),
      );

    // Formatar as datas para strings no formato YYYY-MM-DD
    const formattedBlockedDates = blockedDates.map((row) =>
      dayjs(row.date).tz(APP_TIMEZONE).format("YYYY-MM-DD"),
    );
    const formattedAdHocAvailableDates = adHocAvailableDates.map((row) =>
      dayjs(row.date).tz(APP_TIMEZONE).format("YYYY-MM-DD"),
    );

    return NextResponse.json({
      blockedDates: formattedBlockedDates,
      adHocAvailableDates: formattedAdHocAvailableDates,
    });
  } catch (error) {
    console.error("Erro ao buscar datas bloqueadas/ad-hoc:", error);
    return NextResponse.json(
      { error: "Erro ao buscar datas de agendamento." },
      { status: 500 },
    );
  }
}
