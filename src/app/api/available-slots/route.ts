// src/app/api/available-slots/route.ts
import { db } from "@/db";
import {
  appointmentsTable,
  doctorsTable,
  blockedTimeSlotsTable,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const APP_TIMEZONE = "America/Fortaleza";
const SLOT_INTERVAL_MINUTES = 30; // Intervalo dos slots de agendamento

export async function POST(request: Request) {
  const { doctorId, date, clinicId } = await request.json();

  if (!doctorId || !date || !clinicId) {
    return NextResponse.json(
      { error: "Dados incompletos para buscar horários." },
      { status: 400 },
    );
  }

  try {
    // Buscar informações do médico para obter o horário de trabalho
    const doctor = await db
      .select({
        availableFromTime: doctorsTable.availableFromTime,
        availableToTime: doctorsTable.availableToTime,
      })
      .from(doctorsTable)
      .where(eq(doctorsTable.id, doctorId))
      .limit(1);

    if (!doctor.length) {
      return NextResponse.json(
        { error: "Médico não encontrado." },
        { status: 404 },
      );
    }

    const { availableFromTime, availableToTime } = doctor[0];

    // Converter a data para um objeto Day.js no fuso horário da aplicação
    const targetDate = dayjs.tz(date, APP_TIMEZONE);
    const targetDateOnly = targetDate.startOf("day").toDate(); // Apenas a data para query do BD

    // Gerar todos os slots possíveis para o dia
    const allPossibleSlots: { time: string; dateTime: dayjs.Dayjs }[] = [];
    let currentSlotTime = dayjs.tz(
      date + "T" + availableFromTime,
      APP_TIMEZONE,
    );
    const endOfDayTime = dayjs.tz(date + "T" + availableToTime, APP_TIMEZONE);

    while (currentSlotTime.isBefore(endOfDayTime)) {
      // Ignorar slots que já passaram se for o dia atual
      const now = dayjs().tz(APP_TIMEZONE);
      if (currentSlotTime.isBefore(now)) {
        currentSlotTime = currentSlotTime.add(SLOT_INTERVAL_MINUTES, "minute");
        continue;
      }

      allPossibleSlots.push({
        time: currentSlotTime.format("HH:mm"),
        dateTime: currentSlotTime,
      });
      currentSlotTime = currentSlotTime.add(SLOT_INTERVAL_MINUTES, "minute");
    }

    // Buscar agendamentos existentes para o médico e dia
    const existingAppointments = await db
      .select({ date: appointmentsTable.date })
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.doctorId, doctorId),
          sql`DATE(${appointmentsTable.date}) = ${targetDate.format("YYYY-MM-DD")}`, // Comparar apenas a data
          eq(appointmentsTable.clinicId, clinicId),
          // Opcional: filtrar apenas agendamentos "ativos" para evitar conflito com cancelados/no_show
          // eq(appointmentsTable.status, "scheduled")
        ),
      );

    const bookedTimes = new Set(
      existingAppointments.map((appt) =>
        dayjs(appt.date).tz(APP_TIMEZONE).format("HH:mm"),
      ),
    );

    // NOVO: Buscar horários bloqueados específicos para este médico e clínica neste dia
    const blockedSpecificTimes = await db
      .select({ time: blockedTimeSlotsTable.time })
      .from(blockedTimeSlotsTable)
      .where(
        and(
          eq(blockedTimeSlotsTable.doctorId, doctorId),
          eq(blockedTimeSlotsTable.clinicId, clinicId),
          eq(blockedTimeSlotsTable.date, targetDateOnly), // Comparar o objeto Date
        ),
      );
    const blockedSlotTimes = new Set(
      blockedSpecificTimes.map((row) => row.time),
    );

    // Filtrar slots:
    // - Remover os já agendados
    // - Remover os que foram bloqueados especificamente
    const availableSlots = allPossibleSlots
      .filter(
        (slot) =>
          !bookedTimes.has(slot.time) && !blockedSlotTimes.has(slot.time),
      )
      .map((slot) => ({ time: slot.time, available: true }));

    return NextResponse.json(availableSlots);
  } catch (error) {
    console.error("Erro ao gerar horários disponíveis:", error);
    return NextResponse.json(
      { error: "Erro ao carregar horários disponíveis." },
      { status: 500 },
    );
  }
}
