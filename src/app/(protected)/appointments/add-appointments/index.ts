// src/app/(protected)/appointments/add-appointments/index.ts
"use server";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { eq } from "drizzle-orm"; // 'and' e 'eq' são usados na cláusula .where()
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getAvailableTimes } from "@/actions/get-available-times"; // 'getAvailableTimes' é usado
import { db } from "@/db";
import { appointmentsTable, doctorsTable } from "@/db/schema"; // 'doctorsTable' e 'appointmentsTable' são usados
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

import { addAppointmentSchema } from "./schema";

dayjs.extend(utc);
dayjs.extend(timezone);

const APP_TIMEZONE = "America/Fortaleza";

export const addAppointment = actionClient
  .schema(addAppointmentSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    const clinicId = session.user.clinic?.id;
    if (!clinicId) {
      throw new Error("Clinic not found for user session");
    }

    const doctor = await db
      .select({
        id: doctorsTable.id,
        clinicId: doctorsTable.clinicId,
        appointmentPriceInCents: doctorsTable.appointmentPriceInCents,
        name: doctorsTable.name,
      })
      .from(doctorsTable)
      .where(eq(doctorsTable.id, parsedInput.doctorId))
      .limit(1);

    if (!doctor.length) {
      throw new Error("Profissional não encontrado.");
    }
    const selectedDoctor = doctor[0];

    const appointmentDateTimeCandidate = dayjs
      .tz(
        `${dayjs(parsedInput.date).format("YYYY-MM-DD")}T${parsedInput.time}:00`,
        APP_TIMEZONE,
      )
      .toDate();

    const availableTimesResult = await getAvailableTimes({
      date: dayjs(parsedInput.date).format("YYYY-MM-DD"),
      doctorId: parsedInput.doctorId,
    });

    if (!availableTimesResult || !availableTimesResult.data) {
      throw new Error("Não foi possível verificar horários disponíveis.");
    }

    const isTimeAvailable = availableTimesResult.data.some(
      (time) => time.value === parsedInput.time && time.available,
    );
    if (!isTimeAvailable) {
      throw new Error("Este horário não está mais disponível.");
    }

    await db.insert(appointmentsTable).values({
      patientId: parsedInput.patientId,
      doctorId: parsedInput.doctorId,
      clinicId: clinicId,
      date: appointmentDateTimeCandidate,
      appointmentPriceInCents: selectedDoctor.appointmentPriceInCents,
      status: "scheduled",
      modality: parsedInput.modality,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePath("/appointments");
    return { success: true };
  });
