// src/app/public-booking/actions.ts
"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/index";
import { appointmentsTable, doctorsTable, patientsTable } from "@/db/schema";

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
      // 1. Fetch doctor and validate (Nenhuma alteração aqui)
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

      const selectedDoctor = doctor[0];

      // 2. Check if appointment slot is still available (Nenhuma alteração aqui)
      const existingAppointment = await tx
        .select({ id: appointmentsTable.id })
        .from(appointmentsTable)
        .where(
          and(
            eq(appointmentsTable.doctorId, data.appointment.doctorId),
            eq(
              appointmentsTable.date,
              new Date(`${data.appointment.date}T${data.appointment.time}:00`),
            ),
          ),
        )
        .limit(1);

      if (existingAppointment.length > 0) {
        throw new Error("Este horário não está mais disponível");
      }

      // >>> ALTERAÇÃO PRINCIPAL: REUTILIZAR PACIENTE OU CRIAR NOVO <<<
      let patientIdToUse: string;

      // Verifica se o paciente já existe pelo email
      const existingPatientRecords = await tx
        .select({ id: patientsTable.id })
        .from(patientsTable)
        .where(eq(patientsTable.email, data.patient.email))
        .limit(1); // Limita a 1, pois queremos apenas saber se existe

      if (existingPatientRecords.length > 0) {
        // Se o paciente existe, reutiliza o ID
        patientIdToUse = existingPatientRecords[0].id;
        // Opcional: Se quiser atualizar o nome/telefone/sexo do paciente existente,
        // você faria um tx.update(patientsTable).set({...}).where(...) aqui.
        // Por enquanto, vamos apenas reutilizar o ID.
      } else {
        // Se o paciente NÃO existe, cria um novo
        const newPatient = await tx
          .insert(patientsTable)
          .values({
            name: data.patient.name,
            email: data.patient.email,
            phoneNumber: data.patient.phoneNumber,
            sex: data.patient.sex,
            clinicId: selectedDoctor.clinicId, // Associa à clínica do médico
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({ id: patientsTable.id });

        if (!newPatient.length) {
          throw new Error("Erro ao criar paciente");
        }
        patientIdToUse = newPatient[0].id;
      }
      // <<< FIM DA ALTERAÇÃO PRINCIPAL >>>

      // 5. Create appointment (agora usando patientIdToUse)
      const appointmentDateTime = new Date(
        `${data.appointment.date}T${data.appointment.time}:00`,
      );

      const newAppointment = await tx
        .insert(appointmentsTable)
        .values({
          patientId: patientIdToUse, // <<< Usa o ID do paciente (existente ou novo)
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
