"use client";

import { supabase } from "@/lib/supabase";

export type OrganisationClaimRow = {
  invite_id: string;
  organisation_id: string;
  organisation_name: string;
  licence_id: string;
  intended_role: string;
  result_code: string;
  result_message: string;
};

const CLAIM_MESSAGE_KEY = "dreamscape-organisation-claim-message";

export async function claimMyOrganisationInvites() {
  const { data, error } = await supabase.rpc(
    "claim_my_organisation_invites",
  );

  if (error) {
    return {
      rows: [] as OrganisationClaimRow[],
      claimedRows: [] as OrganisationClaimRow[],
      message: "",
      error,
    };
  }

  const rows = (data || []) as OrganisationClaimRow[];
  const claimedRows = rows.filter(
    (row) => row.result_code === "claimed",
  );

  let message = "";

  if (claimedRows.length === 1) {
    message = `Your account has been connected to ${claimedRows[0].organisation_name}.`;
  } else if (claimedRows.length > 1) {
    message = `Your account has been connected to ${claimedRows.length} education organisations.`;
  }

  if (
    message &&
    typeof window !== "undefined"
  ) {
    window.sessionStorage.setItem(
      CLAIM_MESSAGE_KEY,
      message,
    );
  }

  return {
    rows,
    claimedRows,
    message,
    error: null,
  };
}

export function takeOrganisationClaimMessage() {
  if (typeof window === "undefined") {
    return "";
  }

  const message =
    window.sessionStorage.getItem(CLAIM_MESSAGE_KEY) || "";

  if (message) {
    window.sessionStorage.removeItem(CLAIM_MESSAGE_KEY);
  }

  return message;
}
