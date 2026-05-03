import { redirect } from "next/navigation";

export default function CmsUsersRedirect() {
  // Gestión de usuarios unificada en /app/users
  redirect("/app/users");
}
