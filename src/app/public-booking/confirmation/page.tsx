// src/app/public-booking/confirmation/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle, Clock, Stethoscope, User } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation"; // Este import está correto
import { Suspense } from "react";

import {
  AppointmentDetails,
  getAppointmentDetailsAction,
} from "@/actions/get-appointment-details";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// >>> REMOVIDO: A interface ConfirmationPageProps não é mais necessária <<<
// interface ConfirmationPageProps {
//   searchParams: { id?: string } // Linha que foi removida da interface
// }

function ConfirmationContent({ appointmentId }: { appointmentId: string }) {
  return (
    <Suspense fallback={<div>Carregando detalhes do agendamento...</div>}>
      <ConfirmationDetailsClient appointmentId={appointmentId} />
    </Suspense>
  );
}

function ConfirmationDetailsClient({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const {
    data: appointment,
    isLoading,
    isError,
    error,
  } = useQuery<AppointmentDetails | null, Error>({
    queryKey: ["appointmentDetails", appointmentId],
    queryFn: async () => {
      const result = await getAppointmentDetailsAction(appointmentId);
      if (!result) {
        throw new Error("Agendamento não encontrado.");
      }
      return result;
    },
    enabled: !!appointmentId,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">
              Carregando detalhes do agendamento...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    console.error("Erro ao carregar agendamento com useQuery:", error);
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600">
              Erro ao carregar agendamento:{" "}
              {error?.message || "Por favor, tente novamente."}
            </p>
            <Button asChild className="mt-4">
              <Link href="/public-booking">Fazer novo agendamento</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600">Agendamento não encontrado.</p>
            <Button asChild className="mt-4">
              <Link href="/public-booking">Fazer novo agendamento</Link>
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
              {appointment.modality && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Modalidade:</span>
                  <p className="font-medium capitalize">
                    {appointment.modality}
                  </p>
                </div>
              )}

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
              {appointment.clinicPhoneNumber && (
                <li>
                  • Número para contato caso tenha dúvidas ou caso deseje
                  cancelar: {appointment.clinicPhoneNumber}
                </li>
              )}
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href="/public-booking">Fazer Novo Agendamento</Link>
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

export default function ConfirmationPage() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("id");

  if (!appointmentId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600">
              ID do agendamento não fornecido na URL.
            </p>
            <Button asChild className="mt-4">
              <Link href="/public-booking">Fazer novo agendamento</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ConfirmationContent appointmentId={appointmentId} />;
}
