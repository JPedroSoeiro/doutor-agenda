// src/app/(protected)/patients/_components/table-actions.tsx
import { EditIcon, MoreVerticalIcon, TrashIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { deletePatient } from "@/actions/delete-patient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { patientsTable } from "@/db/schema";

import UpsertPatientForm from "./upsert-patient-form";

interface PatientsTableActionsProps {
  patient: typeof patientsTable.$inferSelect;
}

const PatientsTableActions = ({ patient }: PatientsTableActionsProps) => {
  const [upsertDialogIsOpen, setUpsertDialogIsOpen] = useState(false);

  const deletePatientAction = useAction(deletePatient, {
    onSuccess: () => {
      toast.success("Paciente deletado com sucesso.");
    },
    onError: () => {
      toast.error("Erro ao deletar paciente.");
    },
  });

  const handleDeletePatientClick = () => {
    if (!patient) return;
    deletePatientAction.execute({ id: patient.id });
  };

  return (
    <>
      <Dialog open={upsertDialogIsOpen} onOpenChange={setUpsertDialogIsOpen}>
        <DropdownMenu>
          {/* MUDANÇA AQUI:
              O DropdownMenuTrigger precisa de `asChild`.
              Em vez de usar seu <Button asChild>, vamos usar um <button> HTML direto
              dentro do DropdownMenuTrigger. Isso garante que o Trigger
              esteja recebendo um único elemento para "controlar".
              O Button de UI é útil para estilos, mas pode complicar a composição com `asChild`.
          */}
          <DropdownMenuTrigger asChild>
            {/* NOVO: Usar um botão HTML simples e aplicar os estilos do Button manualmente */}
            <button
              type="button"
              className="focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground inline-flex h-9 w-9 items-center justify-center rounded-md p-0 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" // Estilos de 'ghost' e 'icon' do seu Button
              aria-label="Abrir menu de ações do paciente" // Boa prática de acessibilidade
            >
              <MoreVerticalIcon className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>{patient.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setUpsertDialogIsOpen(true)}>
              <EditIcon className="mr-2 h-4 w-4" />{" "}
              {/* Adicione mr-2 h-4 w-4 para alinhar com o outro */}
              Editar
            </DropdownMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                {/* Esta parte já estava correta na última revisão, mas reafirmo */}
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
                  <button
                    type="button"
                    className="flex w-full items-center text-left"
                  >
                    <TrashIcon className="mr-2 h-4 w-4" />
                    Excluir
                  </button>
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Tem certeza que deseja deletar esse paciente?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação não pode ser revertida. Isso irá deletar o
                    paciente e todas as consultas agendadas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeletePatientClick}>
                    Deletar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>

        <UpsertPatientForm
          isOpen={upsertDialogIsOpen}
          patient={patient}
          onSuccess={() => setUpsertDialogIsOpen(false)}
        />
      </Dialog>
    </>
  );
};

export default PatientsTableActions;
