import { asc, eq } from "drizzle-orm"; // <<< Garanta que 'asc' está importado
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DataTable } from "@/components/ui/data-table";
import {
  PageActions,
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";
import { db } from "@/db";
import { appointmentsTable, doctorsTable, patientsTable } from "@/db/schema";
import { auth } from "@/lib/auth";

import AddAppointmentButton from "./_components/add-appointment-button";
import { appointmentsTableColumns } from "./_components/table-columns";

const AppointmentsPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/authentication");
  }
  if (!session.user.clinic) {
    redirect("/clinic-form");
  }

  // Obtenha o clinicId da sessão
  const userClinicId = session.user.clinic.id;

  const [patients, doctors, appointments] = await Promise.all([
    db.query.patientsTable.findMany({
      where: eq(patientsTable.clinicId, userClinicId), // Filtra pacientes pela clínica do usuário
    }),
    db.query.doctorsTable.findMany({
      where: eq(doctorsTable.clinicId, userClinicId), // Filtra médicos pela clínica do usuário
    }),
    db.query.appointmentsTable.findMany({
      where: eq(appointmentsTable.clinicId, userClinicId), // Filtra agendamentos pela clínica do usuário
      with: {
        patient: true,
        doctor: true,
      },
      // >>> AQUI ESTÁ A ALTERAÇÃO: Adicionar ordenação por data <<<
      orderBy: asc(appointmentsTable.date), // Ordena os agendamentos pela data em ordem crescente (do mais antigo para o mais recente)
    }),
  ]);

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Agendamentos</PageTitle>
          <PageDescription>
            Gerencie os agendamentos da sua clínica
          </PageDescription>
        </PageHeaderContent>
        <PageActions>
          <AddAppointmentButton patients={patients} doctors={doctors} />
        </PageActions>
      </PageHeader>
      <PageContent>
        <DataTable data={appointments} columns={appointmentsTableColumns} />
      </PageContent>
    </PageContainer>
  );
};

export default AppointmentsPage;
