// src/app/(protected)/doctors/_components/doctor-block-calendar-modal.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Caminhos de importação para as actions
// Se der erro de "Cannot find module", verifique o path e faça 'npm install'
import { blockDate } from "../../../../actions/block-date.ts";
import { adHocAvailability } from "../../../../actions/ad-hoc-availability.ts";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

interface DoctorBlockCalendarModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: {
    id: string;
    name: string;
    availableFromWeekDay: number;
    availableToWeekDay: number;
  };
}

interface BlockedDateResponse {
  date: string;
}

export default function DoctorBlockCalendarModal({
  isOpen,
  onOpenChange,
  doctor,
}: DoctorBlockCalendarModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [adHocAvailableDates, setAdHocAvailableDates] = useState<Date[]>([]);
  const [reason, setReason] = useState("");

  // >>> CORREÇÃO: Tipagem explícita para o retorno de useAction <<<
  const blockDateAction = useAction(blockDate, {
    onSuccess: (result) => {
      if (result.data?.success) {
        toast.success(
          result.data.block
            ? "Dia bloqueado com sucesso!"
            : "Dia desbloqueado com sucesso!",
        );
        fetchBlockedDates();
        setSelectedDate(undefined);
        setReason("");
      } else {
        toast.error(result.data?.error || "Erro na operação do dia.");
      }
    },
    onError: (error) => {
      console.error(
        "Erro ao comunicar com o servidor (blockDateAction):",
        error,
      );
    },
  });

  const adHocAvailabilityAction = useAction(adHocAvailability, {
    onSuccess: (result) => {
      if (result.data?.success) {
        toast.success(
          result.data.available
            ? "Disponibilidade adicionada com sucesso!"
            : "Disponibilidade removida com sucesso!",
        );
        fetchBlockedDates();
        setSelectedDate(undefined);
        setReason("");
      } else {
        toast.error(
          result.data?.error || "Erro na operação de disponibilidade.",
        );
      }
    },
    onError: (error) => {
      console.error(
        "Erro ao comunicar com o servidor (adHocAvailabilityAction):",
        error,
      );
    },
  });

  const fetchBlockedDates = useCallback(async () => {
    if (!doctor.id) {
      setBlockedDates([]);
      setAdHocAvailableDates([]);
      return;
    }
    try {
      const blockedResponse = await fetch(
        `/api/blocked-dates?doctorId=${doctor.id}`,
      );
      if (!blockedResponse.ok)
        throw new Error("Falha ao buscar dias bloqueados.");
      const blockedData: { date: string }[] = await blockedResponse.json();
      setBlockedDates(blockedData.map((item) => new Date(item.date)));

      const adHocResponse = await fetch(
        `/api/ad-hoc-available-dates?doctorId=${doctor.id}`,
      );
      if (!adHocResponse.ok) throw new Error("Falha ao buscar dias ad-hoc.");
      const adHocData: { date: string }[] = await adHocResponse.json();
      setAdHocAvailableDates(adHocData.map((item) => new Date(item.date)));
    } catch (err: unknown) {
      console.error(
        "Erro ao carregar dias bloqueados/ad-hoc para o admin:",
        err,
      );
      toast.error("Erro ao carregar dias de agenda para o médico.");
    }
  }, [doctor.id]);

  useEffect(() => {
    if (isOpen) {
      fetchBlockedDates();
    } else {
      setSelectedDate(undefined);
      setReason("");
    }
  }, [isOpen, doctor.id, fetchBlockedDates]);

  const isDateBlocked = (date: Date): boolean => {
    return blockedDates.some(
      (blockedDate) => blockedDate.toDateString() === date.toDateString(),
    );
  };

  const isDateAdHocAvailable = (date: Date): boolean => {
    return adHocAvailableDates.some(
      (adHocDate) => adHocDate.toDateString() === date.toDateString(),
    );
  };

  const isDateWithinDoctorAvailability = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const fromDay = doctor.availableFromWeekDay;
    const toDay = doctor.availableToWeekDay;

    if (fromDay <= toDay) {
      return dayOfWeek >= fromDay && dayOfWeek <= toDay;
    } else {
      return dayOfWeek >= fromDay || dayOfWeek <= toDay;
    }
  };

  const handleDatesChange = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleBlockToggle = () => {
    if (!selectedDate) {
      toast.error("Por favor, selecione uma data.");
      return;
    }
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    blockDateAction.execute({
      doctorId: doctor.id,
      date: formattedDate,
      block: !isDateBlocked(selectedDate),
      reason,
    });
  };

  const handleAdHocToggle = () => {
    if (!selectedDate) {
      toast.error("Por favor, selecione uma data.");
      return;
    }
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    adHocAvailabilityAction.execute({
      doctorId: doctor.id,
      date: formattedDate,
      available: !isDateAdHocAvailable(selectedDate),
      reason,
    });
  };

  const modifiers = {
    blocked: blockedDates,
    adHocAvailable: adHocAvailableDates,
    workingDays: (date: Date) => isDateWithinDoctorAvailability(date),
  };

  const modifiersClassNames = {
    blocked: "bg-red-500 text-white rounded-full",
    adHocAvailable: "bg-green-500 text-white rounded-full",
  };

  return (
    // Removido onOpenChange do DialogContent (pertence ao Dialog pai)
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Bloquear/Adicionar Dias para {doctor.name}</DialogTitle>
        <DialogDescription>
          Selecione dias para bloquear ou adicionar disponibilidade excepcional
          na agenda de {doctor.name}.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-4 py-4">
        <CalendarIcon className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Calendário</h2>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          disabled={(date) => date < new Date()}
        />
        {selectedDate && (
          <div className="flex w-full max-w-sm flex-col gap-2">
            <p className="text-center font-medium">
              Data Selecionada: {format(selectedDate, "PPP", { locale: ptBR })}
            </p>

            <Button
              onClick={handleBlockToggle}
              disabled={
                blockDateAction.isPending || adHocAvailabilityAction.isPending
              }
              variant={isDateBlocked(selectedDate) ? "destructive" : "outline"}
            >
              {blockDateAction.isPending
                ? "Processando..."
                : isDateBlocked(selectedDate)
                  ? "Desbloquear"
                  : "Bloquear Dia"}
            </Button>

            <Button
              onClick={handleAdHocToggle}
              disabled={
                blockDateAction.isPending || adHocAvailabilityAction.isPending
              }
              variant={
                isDateAdHocAvailable(selectedDate) ? "default" : "outline"
              }
            >
              {adHocAvailabilityAction.isPending
                ? "Processando..."
                : isDateAdHocAvailable(selectedDate)
                  ? "Remover Ad-Hoc"
                  : "Adicionar Ad-Hoc"}
            </Button>

            {selectedDate && !isDateBlocked(selectedDate) && (
              <Input
                placeholder="Motivo do bloqueio (opcional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={
                  blockDateAction.isPending || adHocAvailabilityAction.isPending
                }
              />
            )}
          </div>
        )}
      </div>
    </DialogContent>
  );
}
