import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/public-booking");

  return null;
}
