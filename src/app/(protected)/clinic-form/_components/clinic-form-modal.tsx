// src/app/(protected)/clinic-form/_components/clinic-form-modal.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import ClinicForm from "./form"; // Seu ClinicForm real

interface ClinicFormModalProps {
  initialIsOpen: boolean; // Estado inicial do modal (definido pelo Server Component)
  userHasClinic: boolean; // Indica se o usuário já tem uma clínica (definido pelo Server Component)
}

export default function ClinicFormModal({
  initialIsOpen,
  userHasClinic,
}: ClinicFormModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(initialIsOpen);

  // Efeito para redirecionar se o usuário já tem uma clínica (e o modal não deveria abrir)
  useEffect(() => {
    if (userHasClinic && initialIsOpen) {
      // Se o modal deveria abrir, mas o usuário já tem clínica
      setIsOpen(false); // Fecha o modal
      router.replace("/dashboard"); // Redireciona para o dashboard
    }
  }, [userHasClinic, initialIsOpen, router]);

  const handleClose = () => {
    setIsOpen(false); // Fecha o modal
    // No Client Component, o redirecionamento é mais suave.
    router.replace("/dashboard"); // Redireciona para o dashboard após fechar
  };

  // Se o usuário já tem uma clínica e o modal não deveria abrir, não renderiza nada.
  if (userHasClinic && !isOpen) {
    return null; // Não renderiza o modal se já tiver clínica e ele já estiver fechado
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar clínica</DialogTitle>
          <DialogDescription>
            Adicione uma clínica para continuar.
          </DialogDescription>
        </DialogHeader>
        <ClinicForm onClose={handleClose} />{" "}
        {/* Passa a função onClose para o formulário */}
      </DialogContent>
    </Dialog>
  );
}
