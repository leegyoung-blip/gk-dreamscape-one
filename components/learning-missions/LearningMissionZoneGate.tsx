"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  type LearningMissionZoneKey,
  useLearningMissionRouteAccess,
} from "@/hooks/useLearningMissionRouteAccess";

const ZONE_COPY: Record<
  LearningMissionZoneKey,
  {
    title: string;
    lockedTitle: string;
    entitlementTitle: string;
    accent: string;
    membershipText: string;
  }
> = {
  core: {
    title: "Core Missions",
    lockedTitle: "Core Missions are not open to learners yet",
    entitlementTitle: "Core Missions access required",
    accent: "#7ecbff",
    membershipText: "Core or Complete Student Access",
  },
  think: {
    title: "Think Missions",
    lockedTitle: "Think Missions are not open to learners yet",
    entitlementTitle: "Think Missions access required",
    accent: "#60f0d0",
    membershipText: "Core or Complete Student Access",
  },
  science: {
    title: "Science Missions",
    lockedTitle: "Science Missions are not open to learners yet",
    entitlementTitle: "Science Missions access required",
    accent: "#ff9df0",
    membershipText: "Science or Complete Student Access",
  },
};

export default function LearningMissionZoneGate({
  zone,
  children,
}: {
  zone: LearningMissionZoneKey;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const access = useLearningMissionRouteAccess(zone);
  const copy = ZONE_COPY[zone];

  if (access.status === "allowed") {
    return (
      <>
        {access.adminPreview && (
          <div
            style={{
              position: "fixed",
              top: "14px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10000,
              minHeight: "38px",
              maxWidth: "calc(100vw - 28px)",
              borderRadius: "999px",
              border: "1px solid rgba(196,181,253,0.42)",
              background: "rgba(44,20,82,0.9)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              boxShadow:
                "0 16px 34px rgba(0,0,0,0.38), 0 0 26px rgba(139,92,246,0.18)",
              color: "#ede9fe",
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <span aria-hidden="true">◆</span>
            Admin Preview · Learner Access OFF
          </div>
        )}
        {children}
      </>
    );
  }

  if (access.status === "checking") {
    return (
      <MissionGateScreen
        accent={copy.accent}
        eyebrow="Checking Access"
        title={`Preparing ${copy.title}`}
        text="Verifying this mission zone before loading its content."
        loading
      />
    );
  }

  if (access.status === "signed_out") {
    const next = encodeURIComponent(pathname || `/learning-missions/${zone}`);

    return (
      <MissionGateScreen
        accent={copy.accent}
        eyebrow={copy.title}
        title="Log in to continue"
        text={`Sign in first so Dreamscape can check whether this account can enter ${copy.title}.`}
        primaryHref={`/login?next=${next}`}
        primaryLabel="Log In"
        secondaryHref="/learning-missions"
        secondaryLabel="Back to Mission Centre"
      />
    );
  }

  if (access.status === "release_locked") {
    return (
      <MissionGateScreen
        accent={copy.accent}
        eyebrow="Learner Access Closed"
        title={copy.lockedTitle}
        text="This zone is still visible in Nova’s Mission Centre, but its global Learner Access switch is currently OFF. Administrators can continue to preview it without releasing it."
        primaryHref="/learning-missions"
        primaryLabel="Back to Mission Centre"
      />
    );
  }

  if (access.status === "entitlement_locked") {
    return (
      <MissionGateScreen
        accent={copy.accent}
        eyebrow={copy.title}
        title={copy.entitlementTitle}
        text={`${copy.title} is released, but this account does not currently include ${copy.membershipText}.`}
        primaryHref="/nova/membership-portal"
        primaryLabel="View Student Access"
        secondaryHref="/learning-missions"
        secondaryLabel="Back to Mission Centre"
      />
    );
  }

  return (
    <MissionGateScreen
      accent={copy.accent}
      eyebrow="Access Check"
      title="We couldn’t verify this mission zone"
      text={
        access.message ||
        "Dreamscape could not confirm this zone’s current release and access status."
      }
      primaryAction={access.refresh}
      primaryLabel="Try Again"
      secondaryHref="/learning-missions"
      secondaryLabel="Back to Mission Centre"
    />
  );
}

function MissionGateScreen({
  accent,
  eyebrow,
  title,
  text,
  loading = false,
  primaryHref,
  primaryLabel,
  primaryAction,
  secondaryHref,
  secondaryLabel,
}: {
  accent: string;
  eyebrow: string;
  title: string;
  text: string;
  loading?: boolean;
  primaryHref?: string;
  primaryLabel?: string;
  primaryAction?: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        padding: "32px 18px",
        background:
          "radial-gradient(circle at 50% 0%, rgba(83,215,255,0.16), transparent 36%), #020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        display: "grid",
        placeItems: "center",
      }}
    >
      <section
        style={{
          width: "min(620px, 100%)",
          borderRadius: "28px",
          border: `1px solid ${accent}55`,
          background:
            "linear-gradient(145deg, rgba(5,27,55,0.96), rgba(3,10,25,0.98))",
          boxShadow: `0 28px 80px rgba(0,0,0,0.52), 0 0 36px ${accent}18`,
          padding: "34px 28px",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: "64px",
            height: "64px",
            margin: "0 auto",
            borderRadius: "22px",
            border: `1px solid ${accent}66`,
            background: `${accent}15`,
            color: accent,
            display: "grid",
            placeItems: "center",
            fontSize: loading ? "22px" : "28px",
            fontWeight: 900,
            animation: loading ? "missionGatePulse 1.1s ease-in-out infinite" : "none",
          }}
        >
          {loading ? "•••" : "◇"}
        </div>

        <p
          style={{
            margin: "18px 0 0",
            color: accent,
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </p>

        <h1
          style={{
            margin: "10px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "clamp(30px, 7vw, 45px)",
            lineHeight: 1.05,
            fontWeight: 500,
            letterSpacing: "-0.025em",
          }}
        >
          {title}
        </h1>

        <p
          style={{
            margin: "16px auto 0",
            maxWidth: "500px",
            color: "rgba(255,255,255,0.68)",
            fontSize: "14px",
            lineHeight: 1.65,
          }}
        >
          {text}
        </p>

        {(primaryHref || primaryAction || secondaryHref) && (
          <div
            style={{
              marginTop: "24px",
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            {primaryHref && primaryLabel && (
              <Link
                href={primaryHref}
                style={{
                  minHeight: "44px",
                  borderRadius: "13px",
                  border: `1px solid ${accent}66`,
                  background: `${accent}18`,
                  color: "white",
                  textDecoration: "none",
                  padding: "0 16px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 900,
                }}
              >
                {primaryLabel}
              </Link>
            )}

            {primaryAction && primaryLabel && (
              <button
                type="button"
                onClick={primaryAction}
                style={{
                  minHeight: "44px",
                  borderRadius: "13px",
                  border: `1px solid ${accent}66`,
                  background: `${accent}18`,
                  color: "white",
                  padding: "0 16px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  fontWeight: 900,
                }}
              >
                {primaryLabel}
              </button>
            )}

            {secondaryHref && secondaryLabel && (
              <Link
                href={secondaryHref}
                style={{
                  minHeight: "44px",
                  borderRadius: "13px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.045)",
                  color: "rgba(255,255,255,0.76)",
                  textDecoration: "none",
                  padding: "0 16px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                {secondaryLabel}
              </Link>
            )}
          </div>
        )}

        <style>{`
          @keyframes missionGatePulse {
            0%, 100% { opacity: 0.5; transform: scale(0.96); }
            50% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </section>
    </main>
  );
}
