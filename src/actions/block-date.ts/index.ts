"use server";

import { db } from "@/db";
import { blockedDatesTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";
import { z } from "zod";

const blockDateSchema = z.object({
  doctorId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (YYYY-MM-DD)"),
  block: z.boolean(),
  reason: z.string().optional().nullable(),
});

export const blockDate = actionClient
  .schema(blockDateSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.clinic?.id) {
      return {
        success: false,
        error: "Clínica não encontrada ou não autorizado.",
        block: parsedInput.block,
      };
    }
    const clinicId = session.user.clinic.id;
    const targetDate = new Date(parsedInput.date);

    try {
      if (parsedInput.block) {
        await db
          .insert(blockedDatesTable)
          .values({
            clinicId: clinicId,
            doctorId: parsedInput.doctorId,
            date: targetDate,
            reason: parsedInput.reason || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoNothing({
            target: [blockedDatesTable.doctorId, blockedDatesTable.date],
          });
      } else {
        await db
          .delete(blockedDatesTable)
          .where(
            and(
              eq(blockedDatesTable.clinicId, clinicId),
              eq(blockedDatesTable.doctorId, parsedInput.doctorId),
              eq(blockedDatesTable.date, targetDate),
            ),
          );
      }

      revalidatePath("/public-booking");
      revalidatePath("/doctors");
      return { success: true, block: parsedInput.block };
    } catch (error) {
      console.error("Erro ao bloquear/desbloquear data:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Falha ao operar a data.",
        block: parsedInput.block,
      };
    }
  });
