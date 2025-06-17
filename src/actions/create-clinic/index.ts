// src/actions/create-clinic.ts
"use server";

import { revalidatePath } from "next/cache"; // IMPORTANTE: Para revalidar cache de rotas
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";

import { db } from "@/db";
import { clinicsTable, usersToClinicsTable } from "@/db/schema"; // Importe usersToClinicsTable
import { auth } from "@/lib/auth"; // Sua biblioteca de autenticação

interface CreateClinicData {
  name: string;
  address: string | null;
  phoneNumber: string;
  email: string;
}

export async function createClinic(
  data: CreateClinicData,
): Promise<{ success: boolean; error?: string; clinicId?: string }> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false, error: "Não autorizado." };
  }
  const userId = session.user.id;
  if (!userId) {
    return { success: false, error: "ID de usuário não encontrado na sessão." };
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Usar transação para atomicidade
      // 1. Criar a Clínica
      const [newClinic] = await tx
        .insert(clinicsTable)
        .values({
          name: data.name,
          address: data.address,
          phoneNumber: data.phoneNumber,
          email: data.email,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: clinicsTable.id });

      if (!newClinic) {
        throw new Error("Erro ao obter ID da clínica criada.");
      }

      // 2. Vincular a clínica recém-criada ao usuário
      await tx.insert(usersToClinicsTable).values({
        userId: userId,
        clinicId: newClinic.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 3. Forçar a revalidação do cache de dados da sessão
      // Isso é CRUCIAL para que o Next.js saiba que a sessão do usuário mudou
      // e contenha a nova clinicId.
      revalidatePath("/dashboard"); // Revalida o dashboard, onde a sessão é lida.
      revalidatePath("/"); // Revalida o root layout, que também pode ler a sessão.
      // Se você tiver uma rota "/configuracoes-clinica", revalide-a também.

      return { success: true, clinicId: newClinic.id };
    });

    return result;
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Erro ao criar clínica na Server Action:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao criar clínica. Verifique os dados e tente novamente.",
    };
  }
}
