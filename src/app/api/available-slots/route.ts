import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db/index";
import { appointmentsTable, doctorsTable } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const { doctorId, date } = await request.json();

    if (!doctorId || !date) {
      return NextResponse.json(
        { error: "Doctor ID and date are required" },
        { status: 400 },
      );
    }

    // Get doctor's availability
    const doctor = await db
      .select({
        availableFromTime: doctorsTable.availableFromTime,
        availableToTime: doctorsTable.availableToTime,
      })
      .from(doctorsTable)
      .where(eq(doctorsTable.id, doctorId))
      .limit(1);

    if (!doctor.length) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    // Get existing appointments for this doctor on this date
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const existingAppointments = await db
      .select({
        date: appointmentsTable.date,
      })
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.doctorId, doctorId),
          and(
            eq(appointmentsTable.date, startOfDay),
            eq(appointmentsTable.date, endOfDay),
          ),
        ),
      );

    // Generate time slots
    const slots = generateTimeSlots(
      doctor[0].availableFromTime,
      doctor[0].availableToTime,
      existingAppointments.map((apt) => apt.date),
    );

    return NextResponse.json(slots);
  } catch (error) {
    console.error("Error fetching available slots:", error);
    return NextResponse.json(
      { error: "Erro ao buscar horários disponíveis" },
      { status: 500 },
    );
  }
}

function generateTimeSlots(
  fromTime: string,
  toTime: string,
  bookedTimes: Date[],
) {
  const slots = [];
  const [fromHour, fromMinute] = fromTime.split(":").map(Number);
  const [toHour, toMinute] = toTime.split(":").map(Number);

  const bookedTimeStrings = bookedTimes.map((date) =>
    date.toTimeString().substring(0, 5),
  );

  let currentHour = fromHour;
  let currentMinute = fromMinute;

  while (
    currentHour < toHour ||
    (currentHour === toHour && currentMinute < toMinute)
  ) {
    const timeString = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

    slots.push({
      time: timeString,
      available: !bookedTimeStrings.includes(timeString),
    });

    // Increment by 30 minutes
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour += 1;
    }
  }

  return slots;
}
