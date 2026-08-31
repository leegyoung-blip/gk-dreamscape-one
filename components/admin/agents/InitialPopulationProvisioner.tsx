"use client";

import {
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

const DISPLAY_CONFIRMATION =
  "PROVISION INITIAL 100";

const API_CONFIRMATION =
  "PROVISION_INITIAL_100";

type BatchResult = {
  ok?: boolean;

  done?: boolean;

  total?: number;
  provisioned?: number;
  remaining?: number;

  batchProcessed?: number;

  failedAgent?:
    string;

  error?:
    string;

  message?:
    string;

  results?: Array<{
    agentCode?: string;
    ok?: boolean;
    status?: string;
    message?: string;
  }>;
};

export default function InitialPopulationProvisioner() {
  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    confirmation,
    setConfirmation,
  ] =
    useState("");

  const [
    running,
    setRunning,
  ] =
    useState(false);

  const [
    provisioned,
    setProvisioned,
  ] =
    useState(0);

  const [
    remaining,
    setRemaining,
  ] =
    useState(100);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");


  async function getToken() {
    const {
      data: {
        session,
      },
    } =
      await supabase
        .auth
        .getSession();

    return (
      session
        ?.access_token ||
      null
    );
  }


  async function provisionPopulation() {
    if (
      confirmation !==
      DISPLAY_CONFIRMATION
    ) {
      setError(
        `Type "${DISPLAY_CONFIRMATION}" exactly to continue.`,
      );

      return;
    }


    setRunning(true);

    setError("");

    setMessage(
      "Starting secure provisioning...",
    );


    try {
      const token =
        await getToken();


      if (!token) {
        throw new Error(
          "Your admin session has expired. Please sign in again.",
        );
      }


      /*
       * 100 agents / 5 per request = 20 requests.
       *
       * 25 gives us some safety headroom while preventing
       * an accidental infinite browser loop.
       */
      for (
        let pass = 1;
        pass <= 25;
        pass += 1
      ) {
        setMessage(
          `Provisioning batch ${pass}...`,
        );


        const response =
          await fetch(
            "/api/admin/agents/provision-initial",
            {
              method:
                "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  confirmation:
                    API_CONFIRMATION,

                  batchSize:
                    5,
                }),
            },
          );


        const payload =
          (
            await response
              .json()
          ) as BatchResult;


        if (
          typeof payload
            .provisioned ===
          "number"
        ) {
          setProvisioned(
            payload.provisioned,
          );
        }


        if (
          typeof payload
            .remaining ===
          "number"
        ) {
          setRemaining(
            payload.remaining,
          );
        }


        if (
          !response.ok ||
          !payload.ok
        ) {
          throw new Error(
            payload.error ||
              payload.message ||
              (
                payload.failedAgent
                  ? `Provisioning stopped at ${payload.failedAgent}.`
                  : "Provisioning stopped because a batch failed."
              ),
          );
        }


        setMessage(
          payload.message ||
            "Batch complete.",
        );


        if (
          payload.done
        ) {
          setProvisioned(
            100,
          );

          setRemaining(
            0,
          );

          setMessage(
            "All 100 agents were provisioned successfully. Reloading the Agent Control Centre...",
          );


          window.setTimeout(
            () => {
              window.location.reload();
            },
            1200,
          );

          return;
        }
      }


      throw new Error(
        "Provisioning stopped after the maximum number of safe browser batches. You can resume it by clicking the provisioning button again.",
      );

    } catch (
      provisionError
    ) {
      setError(
        provisionError instanceof
          Error
          ? provisionError.message
          : "Population provisioning failed.",
      );

      setMessage(
        "Provisioning paused. Already completed agents remain safely provisioned. Running it again will resume from the next missing identity.",
      );

    } finally {
      setRunning(false);
    }
  }


  if (!open) {
    return (
      <section className="mt-6 rounded-[28px] border border-amber-200/15 bg-amber-200/[0.045] p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-100">
          Phase 1G
        </p>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Provision Initial 100
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/48">
              Create the first 100 real Supabase simulation identities. All identities remain dormant and invisible. No Stripe subscription, billing contract or referral is created.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setOpen(
                true,
              )
            }
            className="min-h-12 shrink-0 rounded-full border border-amber-200/30 bg-amber-300/12 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-amber-50 transition hover:bg-amber-300/20"
          >
            Prepare Provisioning
          </button>
        </div>
      </section>
    );
  }


  return (
    <section className="mt-6 rounded-[28px] border border-amber-200/22 bg-[linear-gradient(145deg,rgba(72,49,10,0.32),rgba(5,18,40,0.74))] p-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-100">
        Phase 1G · Destructive Confirmation
      </p>

      <h2 className="mt-3 text-2xl font-bold">
        Create real simulation identities
      </h2>

      <p className="mt-3 max-w-4xl text-sm leading-6 text-white/50">
        This will create real Supabase Auth users and real DREAMSCAPE economy ledger balances. They will still be dormant, the autonomous engine stays off, and public visibility stays off.
      </p>


      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs text-white/45">
          Type exactly:
        </p>

        <code className="mt-2 block text-sm font-bold text-amber-100">
          {DISPLAY_CONFIRMATION}
        </code>

        <input
          value={
            confirmation
          }
          onChange={(
            event,
          ) => {
            setConfirmation(
              event.target
                .value,
            );

            setError("");
          }}
          disabled={
            running
          }
          className="mt-4 min-h-12 w-full max-w-xl rounded-xl border border-white/12 bg-[#061632] px-4 text-sm font-bold text-white outline-none placeholder:text-white/24"
          placeholder={
            DISPLAY_CONFIRMATION
          }
        />
      </div>


      {(running ||
        provisioned > 0) && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-4 text-xs text-white/50">
            <span>
              Provisioned
            </span>

            <strong className="text-white">
              {provisioned} / 100
            </strong>
          </div>

          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-cyan-300 transition-all duration-300"
              style={{
                width:
                  `${Math.min(
                    100,
                    Math.max(
                      0,
                      provisioned,
                    ),
                  )}%`,
              }}
            />
          </div>

          <p className="mt-2 text-xs text-white/35">
            {remaining} remaining
          </p>
        </div>
      )}


      {message && (
        <div className="mt-4 rounded-xl border border-cyan-200/12 bg-cyan-300/[0.045] px-4 py-3 text-sm leading-6 text-cyan-50/70">
          {message}
        </div>
      )}


      {error && (
        <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/[0.07] px-4 py-3 text-sm leading-6 text-rose-100">
          {error}
        </div>
      )}


      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={
            running ||
            confirmation !==
              DISPLAY_CONFIRMATION
          }
          onClick={() =>
            void provisionPopulation()
          }
          className="min-h-12 rounded-full border border-amber-200/32 bg-amber-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          {running
            ? `Provisioning ${provisioned}/100...`
            : "Provision Initial 100"}
        </button>

        {!running && (
          <button
            type="button"
            onClick={() => {
              setOpen(
                false,
              );

              setConfirmation(
                "",
              );

              setError(
                "",
              );

              setMessage(
                "",
              );
            }}
            className="min-h-12 rounded-full border border-white/12 bg-white/[0.045] px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white/65"
          >
            Cancel
          </button>
        )}
      </div>


      <p className="mt-5 text-xs leading-5 text-white/32">
        The process is resumable. If your browser closes, the network drops or a Vercel request ends partway through, return here and run it again. Already completed agents are skipped rather than recreated.
      </p>
    </section>
  );
}