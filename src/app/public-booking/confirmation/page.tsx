"use client";

import { eq } from "drizzle-orm";
import { Calendar, CheckCircle, Clock, Stethoscope, User } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db/index";
import { appointmentsTable, doctorsTable, patientsTable } from "@/db/schema";

interface ConfirmationPageProps {
  searchParams: { id?: string };
}

async function getAppointmentDetails(appointmentId: string) {
  try {
    const appointment = await db
      .select({
        id: appointmentsTable.id,
        date: appointmentsTable.date,
        appointmentPriceInCents: appointmentsTable.appointmentPriceInCents,
        patientName: patientsTable.name,
        patientEmail: patientsTable.email,
        doctorName: doctorsTable.name,
        doctorSpecialty: doctorsTable.specialty,
      })
      .from(appointmentsTable)
      .innerJoin(
        patientsTable,
        eq(appointmentsTable.patientId, patientsTable.id),
      )
      .innerJoin(doctorsTable, eq(appointmentsTable.doctorId, doctorsTable.id))
      .where(eq(appointmentsTable.id, appointmentId))
      .limit(1);

    return appointment[0] || null;
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return null;
  }
}

function ConfirmationContent({ appointmentId }: { appointmentId: string }) {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ConfirmationDetails appointmentId={appointmentId} />
    </Suspense>
  );
}

async function ConfirmationDetails({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const appointment = await getAppointmentDetails(appointmentId);

  if (!appointment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600">Agendamento não encontrado.</p>
            <Button asChild className="mt-4">
              <Link href="/booking">Fazer novo agendamento</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const appointmentDate = new Date(appointment.date);
  const formattedDate = appointmentDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = appointmentDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-700">
            Agendamento Confirmado!
          </CardTitle>
          <CardDescription className="text-lg">
            Seu agendamento foi realizado com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <h3 className="mb-3 font-semibold text-green-800">
              Detalhes do Agendamento
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">{appointment.patientName}</p>
                  <p className="text-sm text-gray-600">
                    {appointment.patientEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Stethoscope className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">{appointment.doctorName}</p>
                  <p className="text-sm text-gray-600">
                    {appointment.doctorSpecialty}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-green-600" />
                <p className="font-medium capitalize">{formattedDate}</p>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-green-600" />
                <p className="font-medium">{formattedTime}</p>
              </div>

              <div className="border-t border-green-200 pt-2">
                <p className="text-lg font-semibold text-green-800">
                  Valor: R${" "}
                  {(appointment.appointmentPriceInCents / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-2 font-semibold text-blue-800">Importante:</h4>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• Chegue com 15 minutos de antecedência</li>
              <li>• Traga um documento com foto</li>
              <li>• Em caso de cancelamento, avise com 24h de antecedência</li>
              <li>
                • Guarde este número do agendamento: #{appointment.id.slice(-8)}
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href="/booking">Fazer Novo Agendamento</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="flex-1"
            >
              Imprimir Comprovante
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const appointmentId = searchParams.id;

  if (!appointmentId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600">ID do agendamento não fornecido.</p>
            <Button asChild className="mt-4">
              <Link href="/booking">Fazer novo agendamento</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ConfirmationContent appointmentId={appointmentId} />;
}
