// src/app/public-booking/actions.ts
"use server";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { and, eq, or } from "drizzle-orm";

import { db } from "@/db/index";
import {
  appointmentsTable,
  doctorsTable,
  patientsTable,
  blockedDatesTable,
  adHocAvailableDatesTable, // Corrigido adHocAvailabilityTable para adHocAvailableDatesTable
  blockedTimeSlotsTable,
} from "@/db/schema";

dayjs.extend(utc);
dayjs.extend(timezone);

const APP_TIMEZONE = "America/Fortaleza";

interface PatientData {
  name: string;
  email: string;
  phoneNumber: string;
  sex: "male" | "female";
}

interface AppointmentData {
  doctorId: string;
  date: string;
  time: string;
  modality: "remoto" | "presencial";
}

interface BookingData {
  patient: PatientData;
  appointment: AppointmentData;
}

export async function createBooking(data: BookingData) {
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Fetch doctor and validate
      const doctor = await tx
        .select({
          id: doctorsTable.id,
          clinicId: doctorsTable.clinicId,
          appointmentPriceInCents: doctorsTable.appointmentPriceInCents,
          name: doctorsTable.name,
          availableFromWeekDay: doctorsTable.availableFromWeekDay,
          availableToWeekDay: doctorsTable.availableToWeekDay,
        })
        .from(doctorsTable)
        .where(eq(doctorsTable.id, data.appointment.doctorId))
        .limit(1);

      if (!doctor.length) {
        throw new Error("Profissional não encontrado");
      }

      const selectedDoctor = doctor[0];

      const localDateTimeString = `${data.appointment.date}T${data.appointment.time}:00`;
      const appointmentDateTime = dayjs
        .tz(localDateTimeString, APP_TIMEZONE)
        .toDate();

      const appointmentDateOnly = dayjs
        .tz(data.appointment.date, APP_TIMEZONE)
        .startOf("day")
        .toDate();

      const currentMoment = dayjs().tz(APP_TIMEZONE);

      if (appointmentDateTime <= currentMoment.toDate()) {
        throw new Error("Não é possível agendar em um horário que já passou.");
      }

      // 2. VALIDAÇÃO DE DISPONIBILIDADE NO SERVIDOR

      // 2.1. Verificar se a data está BLOQUEADA (para o dia inteiro)
      const isDateBlocked = await tx
        .select({ id: blockedDatesTable.id })
        .from(blockedDatesTable)
        .where(
          and(
            eq(blockedDatesTable.doctorId, data.appointment.doctorId),
            eq(blockedDatesTable.clinicId, selectedDoctor.clinicId),
            eq(blockedDatesTable.date, appointmentDateOnly),
          ),
        )
        .limit(1);

      if (isDateBlocked.length > 0) {
        throw new Error(
          `O profissional não está disponível no dia ${data.appointment.date}.`,
        );
      }

      // 2.2. Verificar se o HORÁRIO específico está BLOQUEADO
      const isTimeSlotBlocked = await tx
        .select({ id: blockedTimeSlotsTable.id })
        .from(blockedTimeSlotsTable)
        .where(
          and(
            eq(blockedTimeSlotsTable.doctorId, data.appointment.doctorId),
            eq(blockedTimeSlotsTable.clinicId, selectedDoctor.clinicId),
            eq(blockedTimeSlotsTable.date, appointmentDateOnly),
            eq(blockedTimeSlotsTable.time, data.appointment.time),
          ),
        )
        .limit(1);

      if (isTimeSlotBlocked.length > 0) {
        throw new Error(
          `O horário ${data.appointment.time} não está disponível no dia ${data.appointment.date}.`,
        );
      }

      // 2.3. Verificar a disponibilidade SEMANAL NORMAL
      const dayOfWeek = appointmentDateTime.getDay();
      const isNormalWorkingDay =
        dayOfWeek >= selectedDoctor.availableFromWeekDay &&
        dayOfWeek <= selectedDoctor.availableToWeekDay;

      // 2.4. Verificar se a data tem disponibilidade AD-HOC (sobrescreve a regra semanal)
      const adHocEntry = await tx
        .select({ id: adHocAvailableDatesTable.id }) // Corrigido
        .from(adHocAvailableDatesTable) // Corrigido
        .where(
          and(
            eq(adHocAvailableDatesTable.doctorId, data.appointment.doctorId), // Corrigido
            eq(adHocAvailableDatesTable.clinicId, selectedDoctor.clinicId), // Corrigido
            eq(adHocAvailableDatesTable.date, appointmentDateOnly), // Corrigido
          ),
        )
        .limit(1);

      const isAdHocAvailable = adHocEntry.length > 0;

      // >>> REMOVA OS CONSOLE.LOGS APÓS A DEPURACAO <<<
      // console.log("-----------------------------------------");
      // console.log("Detalhes da Validação de Agendamento:");
      // console.log("Data selecionada:", data.appointment.date);
      // console.log("Hora selecionada:", data.appointment.time);
      // console.log("Doctor ID:", data.appointment.doctorId);
      // console.log("Clinic ID:", selectedDoctor.clinicId);
      // console.log("Dia da semana selecionado (0=Dom, 6=Sáb):", dayOfWeek);
      // console.log(
      //   "Dias de trabalho do médico (ínicio/fim):",
      //   selectedDoctor.availableFromWeekDay,
      //   "/",
      //   selectedDoctor.availableToWeekDay,
      // );
      // console.log("É dia de trabalho normal?", isNormalWorkingDay);
      // console.log(
      //   "A data está bloqueada (dia inteiro)?",
      //   isDateBlocked.length > 0,
      // );
      // console.log(
      //   "O horário está bloqueado (slot específico)?",
      //   isTimeSlotBlocked.length > 0,
      // );
      // console.log("A data tem disponibilidade ad-hoc?", isAdHocAvailable);
      // console.log("-----------------------------------------");

      if (!isNormalWorkingDay && !isAdHocAvailable) {
        throw new Error(
          "Este profissional não atende no dia da semana selecionado ou o dia não está marcado como disponível.",
        );
      }

      // 2.5. Verificar se o horário já está ocupado por outro agendamento (existente)
      const existingAppointment = await tx
        .select({ id: appointmentsTable.id })
        .from(appointmentsTable)
        .where(
          and(
            eq(appointmentsTable.doctorId, data.appointment.doctorId),
            eq(appointmentsTable.date, appointmentDateTime),
          ),
        )
        .limit(1);

      if (existingAppointment.length > 0) {
        throw new Error("Este horário não está mais disponível");
      }

      // 3. Reutilizar paciente existente ou criar novo
      let patientIdToUse: string;

      const existingPatientRecords = await tx
        .select({ id: patientsTable.id })
        .from(patientsTable)
        .where(eq(patientsTable.email, data.patient.email))
        .limit(1);

      if (existingPatientRecords.length > 0) {
        patientIdToUse = existingPatientRecords[0].id;
      } else {
        const newPatient = await tx
          .insert(patientsTable)
          .values({
            name: data.patient.name,
            email: data.patient.email,
            phoneNumber: data.patient.phoneNumber,
            sex: data.patient.sex,
            clinicId: selectedDoctor.clinicId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({ id: patientsTable.id });

        if (!newPatient.length) {
          throw new Error("Erro ao criar paciente");
        }
        patientIdToUse = newPatient[0].id;
      }

      // 4. Create appointment
      const newAppointment = await tx
        .insert(appointmentsTable)
        .values({
          patientId: patientIdToUse,
          doctorId: selectedDoctor.id,
          clinicId: selectedDoctor.clinicId,
          date: appointmentDateTime,
          appointmentPriceInCents: selectedDoctor.appointmentPriceInCents,
          status: "scheduled",
          modality: data.appointment.modality,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: appointmentsTable.id });

      if (!newAppointment.length) {
        throw new Error("Erro ao criar agendamento");
      }

      return {
        patientId: patientIdToUse,
        appointmentId: newAppointment[0].id,
        doctorName: selectedDoctor.name,
      };
    });

    return {
      success: true,
      appointmentId: result.appointmentId,
      patientId: result.patientId,
    };
  } catch (error) {
    console.error("Booking creation error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro interno do servidor",
    };
  }
}
