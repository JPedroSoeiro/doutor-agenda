// src/actions/ad-hoc-availability.ts/index.ts
// CRIE ESTE ARQUIVO SE ELE AINDA NÃO EXISTIR, OU ATUALIZE-O SE JÁ EXISTIR.
"use server";

import { db } from "@/db";
import { adHocAvailableDatesTable } from "@/db/schema"; // Corrigido para adHocAvailableDatesTable
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";
import { z } from "zod";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(timezone);

const APP_TIMEZONE = "America/Fortaleza";

const adHocAvailabilitySchema = z.object({
  doctorId: z.string().uuid(),
  clinicId: z.string().uuid(), // <<< ADICIONADO: clinicId ao schema
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (YYYY-MM-DD)"),
  available: z.boolean(),
  reason: z.string().optional().nullable(),
});

export const adHocAvailability = actionClient
  .schema(adHocAvailabilitySchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.clinic?.id) {
      return {
        success: false,
        error: "Clínica não encontrada ou não autorizado.",
        available: parsedInput.available,
      };
    }
    const clinicIdFromSession = session.user.clinic.id;

    if (clinicIdFromSession !== parsedInput.clinicId) {
      return {
        success: false,
        error: "Clínica incompatível ou não autorizado para esta operação.",
        available: parsedInput.available,
      };
    }

    const targetDate = dayjs
      .tz(parsedInput.date, APP_TIMEZONE)
      .startOf("day")
      .toDate();

    try {
      if (parsedInput.available) {
        await db
          .insert(adHocAvailableDatesTable) // Corrigido para adHocAvailableDatesTable
          .values({
            clinicId: parsedInput.clinicId,
            doctorId: parsedInput.doctorId,
            date: targetDate,
            reason: parsedInput.reason || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoNothing({
            target: [
              adHocAvailableDatesTable.doctorId,
              adHocAvailableDatesTable.date,
            ], // Corrigido
          });
      } else {
        await db
          .delete(adHocAvailableDatesTable) // Corrigido
          .where(
            and(
              eq(adHocAvailableDatesTable.clinicId, parsedInput.clinicId), // Corrigido
              eq(adHocAvailableDatesTable.doctorId, parsedInput.doctorId), // Corrigido
              eq(adHocAvailableDatesTable.date, targetDate), // Corrigido
            ),
          );
      }

      revalidatePath("/public-booking");
      revalidatePath("/doctors");
      revalidatePath("/api/available-slots"); // Revalidar slots também

      return { success: true, available: parsedInput.available };
    } catch (error) {
      console.error("Erro ao operar disponibilidade ad-hoc:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao operar disponibilidade ad-hoc.",
        available: parsedInput.available,
      };
    }
  });
