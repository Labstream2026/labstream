import { redirect } from "next/navigation";

export default async function ServicioRedirect(props: {
  searchParams: Promise<{ id?: string }>;
}) {
  const sp = await props.searchParams;
  if (sp.id) redirect(`/servicio/${sp.id}`);
  redirect("/servicios");
}
