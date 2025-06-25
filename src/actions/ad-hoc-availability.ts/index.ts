// src/actions/ad-hoc-availability.ts
"use server";

import { db } from "@/db";
import { adHocAvailableDatesTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";
import { z } from "zod";

const adHocAvailabilitySchema = z.object({
  doctorId: z.string().uuid(),
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
    const clinicId = session.user.clinic.id;
    const targetDate = new Date(parsedInput.date);

    try {
      if (parsedInput.available) {
        await db
          .insert(adHocAvailableDatesTable)
          .values({
            clinicId: clinicId,
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
            ],
          });
      } else {
        await db
          .delete(adHocAvailableDatesTable)
          .where(
            and(
              eq(adHocAvailableDatesTable.clinicId, clinicId),
              eq(adHocAvailableDatesTable.doctorId, parsedInput.doctorId),
              eq(adHocAvailableDatesTable.date, targetDate),
            ),
          );
      }

      revalidatePath("/public-booking");
      revalidatePath("/doctors");

      return { success: true, available: parsedInput.available };
    } catch (error) {
      console.error("Erro ao operar disponibilidade ad-hoc:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao operar a disponibilidade ad-hoc.",
        available: parsedInput.available,
      };
    }
  });
