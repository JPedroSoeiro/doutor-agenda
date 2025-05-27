import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import SignOutButton from "./sign-out-button";

const DashboardPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/authentication");
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bem-vindo, {session?.user?.name}</p>
      <p>{session?.user?.email}</p>
      <SignOutButton />
    </div>
  );
};

export default DashboardPage;
