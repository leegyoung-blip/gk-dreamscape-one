"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useBankShopper() {
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadShopper() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUserId(user?.id ?? "");
      setUserEmail(user?.email ?? "");
      setLoading(false);
    }

    loadShopper();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setUserId(session?.user?.id ?? "");
      setUserEmail(session?.user?.email ?? "");
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    userId,
    userEmail,
    loading,
    isLoggedIn: Boolean(userId),
  };
}
