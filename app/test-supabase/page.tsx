
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SupabaseTestPage() {
  const [status, setStatus] = useState("Checking connection...");

  useEffect(() => {
    async function checkConnection() {
      try {
        const { error } = await supabase.auth.getSession();

        if (error) {
          setStatus("Connection error: " + error.message);
        } else {
          setStatus("Supabase connected successfully!");
        }
      } catch (error) {
        setStatus(
          "Error: " +
            (error instanceof Error ? error.message : "Unknown error")
        );
      }
    }

    checkConnection();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="rounded-xl border p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">
          Supabase Connection Test
        </h1>
        <p>{status}</p>
      </div>
    </main>
  );
}
