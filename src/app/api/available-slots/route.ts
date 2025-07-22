// src/app/api/available-slots/route.ts
import { db } from "@/db";
import {
  appointmentsTable,
  doctorsTable,
  blockedTimeSlotsTable,
  blockedDatesTable, // Importar blockedDatesTable
  adHocAvailableDatesTable, // Importar adHocAvailableDatesTable
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm"; // Removido 'or'
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
        availableFromWeekDay: doctorsTable.availableFromWeekDay,
        availableToWeekDay: doctorsTable.availableToWeekDay,
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

    const {
      availableFromTime,
      availableToTime,
      availableFromWeekDay,
      availableToWeekDay,
    } = doctor[0];

    // Converter a data de entrada para o fuso horário da aplicação
    const selectedDay = dayjs.tz(date, APP_TIMEZONE);

    // Gerar todos os slots possíveis para o dia
    const startOfDayTime = selectedDay
      .hour(parseInt(availableFromTime.split(":")[0]))
      .minute(parseInt(availableFromTime.split(":")[1]));
    const endOfDayTime = selectedDay
      .hour(parseInt(availableToTime.split(":")[0]))
      .minute(parseInt(availableToTime.split(":")[1]));

    let currentTime = startOfDayTime;
    const allPossibleSlots: string[] = [];
    while (currentTime.isBefore(endOfDayTime)) {
      // Ignorar slots que já passaram se for o dia atual
      const now = dayjs().tz(APP_TIMEZONE);
      if (selectedDay.isSame(now, "day") && currentTime.isBefore(now)) {
        currentTime = currentTime.add(SLOT_INTERVAL_MINUTES, "minute");
        continue;
      }
      allPossibleSlots.push(currentTime.format("HH:mm"));
      currentTime = currentTime.add(SLOT_INTERVAL_MINUTES, "minute");
    }

    // Buscar agendamentos existentes
    const existingAppointments = await db
      .select({
        date: appointmentsTable.date, // CORRIGIDO: Selecionar a coluna 'date'
      })
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.doctorId, doctorId),
          eq(appointmentsTable.clinicId, clinicId),
          eq(appointmentsTable.date, selectedDay.toDate()), // Tipo corrigido
        ),
      );
    // CORRIGIDO: Mapear a data para HH:mm ao criar o Set
    const bookedTimes = new Set(
      existingAppointments.map((appt) =>
        dayjs(appt.date).tz(APP_TIMEZONE).format("HH:mm"),
      ),
    );

    // Buscar horários individualmente bloqueados (se um slot está nesta tabela, ele está BLOQUEADO)
    const blockedIndividualSlots = await db
      .select({
        time: blockedTimeSlotsTable.time, // Selecionar o tempo diretamente
      })
      .from(blockedTimeSlotsTable)
      .where(
        and(
          eq(blockedTimeSlotsTable.doctorId, doctorId),
          eq(blockedTimeSlotsTable.clinicId, clinicId),
          eq(blockedTimeSlotsTable.date, selectedDay.toDate()), // Tipo corrigido
        ),
      );
    const explicitlyBlockedTimes = new Set(
      blockedIndividualSlots.map((s) => s.time),
    );

    // Filtrar os horários disponíveis
    const availableSlotsList = allPossibleSlots
      .filter((slotTime) => {
        // Slot não está agendado E não está explicitamente bloqueado individualmente
        return (
          !bookedTimes.has(slotTime) && !explicitlyBlockedTimes.has(slotTime)
        );
      })
      .map((time) => ({ time, available: true })); // Mapear para o formato de resposta

    return NextResponse.json(availableSlotsList);
  } catch (error) {
    console.error("Erro ao buscar horários disponíveis:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao buscar horários." },
      { status: 500 },
    );
  }
}
