// src/actions/block-time-slot.ts/index.ts
"use server";

import { db } from "@/db";
import { blockedTimeSlotsTable } from "@/db/schema";
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

const blockTimeSlotSchema = z.object({
  doctorId: z.string().uuid(),
  clinicId: z.string().uuid(), // Adicionado: clinicId é essencial
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (YYYY-MM-DD)"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:mm)"),
  block: z.boolean(),
  reason: z.string().optional().nullable(),
});

export const blockTimeSlot = actionClient
  .schema(blockTimeSlotSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.clinic?.id) {
      return {
        success: false,
        error: "Clínica não encontrada ou não autorizado.",
        block: parsedInput.block,
      };
    }
    const clinicIdFromSession = session.user.clinic.id;

    if (clinicIdFromSession !== parsedInput.clinicId) {
      return {
        success: false,
        error: "Clínica incompatível ou não autorizado para esta operação.",
        block: parsedInput.block,
      };
    }

    const targetDate = dayjs
      .tz(parsedInput.date, APP_TIMEZONE)
      .startOf("day")
      .toDate();

    try {
      if (parsedInput.block) {
        await db
          .insert(blockedTimeSlotsTable)
          .values({
            clinicId: parsedInput.clinicId,
            doctorId: parsedInput.doctorId,
            date: targetDate,
            time: parsedInput.time,
            reason: parsedInput.reason || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoNothing({
            target: [
              blockedTimeSlotsTable.doctorId,
              blockedTimeSlotsTable.date,
              blockedTimeSlotsTable.time,
            ],
          });
      } else {
        await db
          .delete(blockedTimeSlotsTable)
          .where(
            and(
              eq(blockedTimeSlotsTable.clinicId, parsedInput.clinicId),
              eq(blockedTimeSlotsTable.doctorId, parsedInput.doctorId),
              eq(blockedTimeSlotsTable.date, targetDate),
              eq(blockedTimeSlotsTable.time, parsedInput.time),
            ),
          );
      }

      revalidatePath("/public-booking");
      revalidatePath("/doctors");
      revalidatePath("/api/available-slots"); // Importante para cache da API de slots

      return { success: true, block: parsedInput.block };
    } catch (error) {
      console.error("Erro ao operar o bloqueio de horário:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao operar o bloqueio de horário.",
        block: parsedInput.block,
      };
    }
  });
