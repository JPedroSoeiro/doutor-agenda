// src/app/(protected)/clinic-form/page.tsx
// ESTE É UM SERVER COMPONENT, NÃO DEVE TER "use client" AQUI

import { headers } from "next/headers"; // Para pegar headers para a sessão
import { redirect } from "next/navigation"; // Para redirecionar se já tiver clínica

import { auth } from "@/lib/auth"; // Importe sua auth para pegar a sessão no servidor

import ClinicFormModal from "./_components/clinic-form-modal";

const ClinicFormPage = async () => {
  // Torne a função async
  const session = await auth.api.getSession({
    // Busca a sessão no servidor
    headers: await headers(),
  });

  // Verifica se o usuário já tem uma clínica vinculada na sessão
  const userHasClinic = !!session?.user?.clinic?.id; // Assumindo que sua sessão retorna clinic.id

  // Se o usuário JÁ TIVER uma clínica, redireciona imediatamente para o dashboard
  if (userHasClinic) {
    redirect("/dashboard"); // Redireciona para o dashboard
  }

  // Se não tiver clínica, renderiza o modal que permitirá criar uma.
  // initialIsOpen é true aqui, pois queremos que ele abra.
  return (
    <div>
      <ClinicFormModal initialIsOpen={true} userHasClinic={userHasClinic} />
    </div>
  );
};

export default ClinicFormPage;
