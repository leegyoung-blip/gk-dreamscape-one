"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";


export default function TopNav() {
  const [loggedIn, setLoggedIn] = useState(false);

useEffect(() => {
  async function checkUser() {
    const { data } = await supabase.auth.getUser();

    setLoggedIn(!!data.user);
  }

  checkUser();
}, []);

  return (
    <div className="absolute right-8 top-8 z-50 flex gap-3">

  {!loggedIn && (
    <Link
      href="/login"
      className="rounded-full bg-indigo-950 px-5 py-2 text-sm text-white shadow-md"
    >
      Login
    </Link>
  )}

  {loggedIn && (
    <>
      <Link
        href="/profile"
        className="rounded-full bg-white/80 px-5 py-2 text-sm text-indigo-950 shadow-md"
      >
        Profile
      </Link>

      <Link
        href="/cart"
        className="rounded-full bg-white/80 px-5 py-2 text-sm text-indigo-950 shadow-md"
      >
        Cart
      </Link>
    </>
  )}

</div>
  );
}