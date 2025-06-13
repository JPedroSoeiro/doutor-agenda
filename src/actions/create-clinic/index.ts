// src/actions/create-clinic.ts
"use server";

import { revalidatePath } from "next/cache"; // <<< NOVO: Importe revalidatePath
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";

import { db } from "@/db";
import { clinicsTable, usersToClinicsTable } from "@/db/schema";
import { auth } from "@/lib/auth";

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

      await tx.insert(usersToClinicsTable).values({
        userId: userId,
        clinicId: newClinic.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // >>> NOVO: REVALIDAR O CAMINHO DO DASHBOARD E O ROOT PARA ATUALIZAR A SESSÃO <<<
      // Isso força o Next.js a re-renderizar Server Components que dependem da sessão.
      revalidatePath("/dashboard"); // Se o usuário vai para o dashboard
      revalidatePath("/"); // Revalida o root (onde o layout principal está)
      // <<< FIM DO NOVO <<<

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
