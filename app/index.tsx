import { Redirect } from "expo-router";
import React from "react";

import { useAuth } from "@/lib/auth";

export default function Index() {
  const { loading, session } = useAuth();
  if (loading) return null;
  return <Redirect href={session ? "/(tabs)" : "/login"} />;
}
