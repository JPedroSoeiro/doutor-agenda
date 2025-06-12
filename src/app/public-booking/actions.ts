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

      // 3. Check if patient already exists (by email)
      const existingPatient = await tx
        .select({ id: patientsTable.id })
        .from(patientsTable)
        .where(eq(patientsTable.email, data.patient.email))
        .limit(1);

      if (existingPatient.length > 0) {
        throw new Error("Já existe um paciente cadastrado com este email");
      }

      // 4. Create new patient
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

      // 5. Create appointment
      const appointmentDateTime = new Date(
        `${data.appointment.date}T${data.appointment.time}:00`,
      );

      const newAppointment = await tx
        .insert(appointmentsTable)
        .values({
          patientId: newPatient[0].id,
          doctorId: selectedDoctor.id,
          clinicId: selectedDoctor.clinicId,
          date: appointmentDateTime,
          appointmentPriceInCents: selectedDoctor.appointmentPriceInCents,
          status: "scheduled",
          // <<< ADICIONE ESTA LINHA AQUI >>>
          modality: data.appointment.modality, // Agora você passa o valor da modalidade
          // <<< FIM DA LINHA ADICIONADA >>>
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: appointmentsTable.id });

      if (!newAppointment.length) {
        throw new Error("Erro ao criar agendamento");
      }

      return {
        patientId: newPatient[0].id,
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
