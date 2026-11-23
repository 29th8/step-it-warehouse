import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import ProfilePageClient from "./profile-page-client";

export const metadata = { title: "Hồ sơ cá nhân | STEP IT Warehouse" };

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return <ProfilePageClient />;
}
