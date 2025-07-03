// src/app/(protected)/doctors/_helpers/availability.ts
import "dayjs/locale/pt-br";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import { doctorsTable } from "@/db/schema";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("pt-br");

const APP_TIMEZONE = "America/Fortaleza";

export const getAvailability = (doctor: typeof doctorsTable.$inferSelect) => {
  const from = dayjs()
    .utc()
    .day(doctor.availableFromWeekDay)
    .set("hour", Number(doctor.availableFromTime.split(":")[0]))
    .set("minute", Number(doctor.availableFromTime.split(":")[1]))
    .set("second", Number(doctor.availableFromTime.split(":")[2] || 0))
    .local();
  const to = dayjs()
    .utc()
    .day(doctor.availableToWeekDay)
    .set("hour", Number(doctor.availableToTime.split(":")[0]))
    .set("minute", Number(doctor.availableToTime.split(":")[1]))
    .set("second", Number(doctor.availableToTime.split(":")[2] || 0))
    .local();
  return { from, to };
};

export const getDayJsAvailability = (
  doctor: Pick<
    typeof doctorsTable.$inferSelect,
    "availableFromTime" | "availableToTime"
  >, // Usar Pick para as props necessárias
) => {
  const fromTimeParts = doctor.availableFromTime.split(":");
  const toTimeParts = doctor.availableToTime.split(":");

  const from = dayjs()
    .tz(APP_TIMEZONE)
    .hour(Number(fromTimeParts[0]))
    .minute(Number(fromTimeParts[1]))
    .second(Number(fromTimeParts[2] || 0));

  const to = dayjs()
    .tz(APP_TIMEZONE)
    .hour(Number(toTimeParts[0]))
    .minute(Number(toTimeParts[1]))
    .second(Number(toTimeParts[2] || 0));

  return { from, to };
};

export const generateTimeSlotsForDay = (
  doctor: Pick<
    typeof doctorsTable.$inferSelect,
    "availableFromTime" | "availableToTime"
  >, // Usar Pick
  date: Date,
  intervalMinutes: number = 30,
): string[] => {
  const slots: string[] = [];
  const { from, to } = getDayJsAvailability(doctor);

  let currentSlot = dayjs(date)
    .tz(APP_TIMEZONE)
    .hour(from.hour())
    .minute(from.minute())
    .second(from.second());

  const endOfDay = dayjs(date)
    .tz(APP_TIMEZONE)
    .hour(to.hour())
    .minute(to.minute())
    .second(to.second());

  while (currentSlot.isBefore(endOfDay)) {
    slots.push(currentSlot.format("HH:mm"));
    currentSlot = currentSlot.add(intervalMinutes, "minute");
  }

  return slots;
};
