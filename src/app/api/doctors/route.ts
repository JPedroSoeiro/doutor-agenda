// O código que você deveria ter em src/app/api/doctors/route.ts
// E que faz a filtragem
import { eq } from "drizzle-orm"; // Importante: 'eq' para a condição de igualdade
import { NextResponse } from "next/server";

import { db } from "@/db";
import { doctorsTable } from "@/db/schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId"); // Obtém o clinicId da URL

    if (!clinicId) {
      // Se não for fornecido um clinicId na URL, retorna um erro 400.
      // Você pode mudar isso para retornar um array vazio ou todos os médicos se for o caso.
      // Mas para o fluxo de "selecionar clínica -> ver médicos da clínica", um erro 400 é válido
      // se clinicId for obrigatório.
      return NextResponse.json(
        { message: "Parâmetro clinicId é obrigatório para buscar médicos." },
        { status: 400 },
      );
    }

    // A QUERY QUE FAZ A FILTRAGEM POR CLÍNICA
    const doctors = await db
      .select({
        id: doctorsTable.id,
        name: doctorsTable.name,
        specialty: doctorsTable.specialty,
        availableFromWeekDay: doctorsTable.availableFromWeekDay,
        availableToWeekDay: doctorsTable.availableToWeekDay,
        availableFromTime: doctorsTable.availableFromTime,
        availableToTime: doctorsTable.availableToTime, // Use availableToTime
        appointmentPriceInCents: doctorsTable.appointmentPriceInCents,
        is_active: doctorsTable.is_active, // Se você filtra por médicos ativos
      })
      .from(doctorsTable)
      .where(eq(doctorsTable.clinicId, clinicId)); // <<< AQUI ESTÁ O FILTRO CRÍTICO

    return NextResponse.json(doctors);
  } catch (error) {
    console.error("Erro ao carregar médicos na API:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor ao carregar médicos." },
      { status: 500 },
    );
  }
}
