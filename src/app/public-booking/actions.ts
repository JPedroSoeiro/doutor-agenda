// src/app/public-booking/actions.ts
"use server";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { and, eq } from "drizzle-orm"; // <<< Essas importações serão usadas

import { db } from "@/db/index";
import { appointmentsTable, doctorsTable, patientsTable } from "@/db/schema"; // <<< Essas importações serão usadas

dayjs.extend(utc);
dayjs.extend(timezone);

const APP_TIMEZONE = "America/Fortaleza"; // Fuso horário da sua aplicação

// >>> INTERFACES NECESSÁRIAS (BookingData, PatientData, AppointmentData) <<<
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
// >>> FIM DAS INTERFACES <<<

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
        })
        .from(doctorsTable)
        .where(eq(doctorsTable.id, data.appointment.doctorId))
        .limit(1);

      if (!doctor.length) {
        throw new Error("Profissional não encontrado");
      }

      const selectedDoctor = doctor[0]; // <<< selectedDoctor é declarado aqui

      // 2. Check if appointment slot is still available
      const localDateTimeString = `${data.appointment.date}T${data.appointment.time}:00`;
      const appointmentDateTime = dayjs
        .tz(localDateTimeString, APP_TIMEZONE)
        .toDate(); // Sem .utc()

      const existingAppointment = await tx
        .select({ id: appointmentsTable.id })
        .from(appointmentsTable)
        .where(
          and(
            // <<< 'and' e 'eq' são usados aqui
            eq(appointmentsTable.doctorId, data.appointment.doctorId),
            eq(appointmentsTable.date, appointmentDateTime),
          ),
        )
        .limit(1);

      if (existingAppointment.length > 0) {
        throw new Error("Este horário não está mais disponível");
      }

      // 3. Reutilizar paciente existente ou criar novo
      let patientIdToUse: string; // <<< patientIdToUse é declarado aqui

      const existingPatientRecords = await tx
        .select({ id: patientsTable.id }) // <<< patientsTable é usada aqui
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
