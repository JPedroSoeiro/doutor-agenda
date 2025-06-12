// src/app/api/clinics/route.ts

import { NextResponse } from "next/server"; // Importe NextResponse do Next.js

import { db } from "@/db"; // Importe sua instância do Drizzle (db)
import { clinicsTable } from "@/db/schema"; // Importe a definição da sua clinicsTable

// Esta função GET será chamada quando alguém acessar /api/clinics
export async function GET() {
  try {
    // Busca todas as clínicas da sua tabela clinicsTable
    const clinics = await db
      .select({
        id: clinicsTable.id,
        name: clinicsTable.name,
        // Você pode adicionar outras colunas que precise aqui, como address, phoneNumber, etc.
      })
      .from(clinicsTable);

    // Retorna a lista de clínicas como uma resposta JSON
    return NextResponse.json(clinics);
  } catch (error) {
    // Em caso de erro, loga no console do servidor e retorna uma resposta de erro 500
    console.error("Erro ao carregar clínicas na API:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor ao carregar clínicas." },
      { status: 500 },
    );
  }
}
