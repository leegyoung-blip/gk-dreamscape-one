"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import { supabase } from "@/lib/supabase";

type DeploymentAsset = {
  asset_id: string;
  storage_bucket: string;
  storage_path: string;
  bytes?: number;
  qc_status?: string;
};

type DeploymentMapping = {
  mapping_id: string;
  question_id: string;
  question_code: string;
  quiz_code?: string;
  image_role: "prompt" | "option";
  option_index?: number | string | null;
  storage_bucket: string;
  storage_path: string;
  public_url?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  qc_status?: string;
};

type DeploymentManifest = {
  batch: string;
  bucket: string;
  summary: {
    source_questions?: number;
    questions_requiring_images?: number;
    prompt_mappings?: number;
    option_mappings?: number;
    total_mappings?: number;
    unique_svg_assets?: number;
    qc_failures?: number;
  };
  assets: DeploymentAsset[];
  mappings: DeploymentMapping[];
  failures?: unknown[];
};

type PackageState = {
  manifest: DeploymentManifest;
  manifestName: string;
  subject: "math" | "science";
  level: number;
  filesByPath: Map<string, File>;
};

type Stage = "idle" | "ready" | "uploading" | "uploaded" | "mapping" | "verifying" | "complete" | "error";

function normalisePath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

function inferPackage(batch: string) {
  const match = /^p([1-6])-(math|science)-/i.exec(batch);
  if (!match) throw new Error(`The deployment batch “${batch}” is not recognised.`);
  return {
    level: Number(match[1]),
    subject: match[2].toLowerCase() as "math" | "science",
  };
}

function mappingGroups(mappings: DeploymentMapping[]) {
  const grouped = new Map<string, DeploymentMapping[]>();
  for (const mapping of mappings) {
    const list = grouped.get(mapping.question_id) || [];
    list.push(mapping);
    grouped.set(mapping.question_id, list);
  }
  return [...grouped.values()];
}

function groupChunks(groups: DeploymentMapping[][], questionLimit = 30) {
  const chunks: DeploymentMapping[][] = [];
  for (let index = 0; index < groups.length; index += questionLimit) {
    chunks.push(groups.slice(index, index + questionLimit).flat());
  }
  return chunks;
}

async function accessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired. Sign in again before deploying assets.");
  return token;
}

async function responseJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(body.error || `Request failed with HTTP ${response.status}.`));
  }
  return body;
}

export default function AssetDeploymentView() {
  const [packageState, setPackageState] = useState<PackageState | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [message, setMessage] = useState("Select an extracted deployment package folder to begin.");
  const [uploaded, setUploaded] = useState(0);
  const [failedPaths, setFailedPaths] = useState<string[]>([]);
  const [mappingProgress, setMappingProgress] = useState(0);
  const [verifiedPrompt, setVerifiedPrompt] = useState(0);
  const [verifiedOption, setVerifiedOption] = useState(0);

  const manifest = packageState?.manifest || null;
  const totalAssets = manifest?.assets.length || 0;
  const totalMappings = manifest?.mappings.length || 0;
  const progressPercent = totalAssets ? Math.round((uploaded / totalAssets) * 100) : 0;

  const statusTone = useMemo(() => {
    if (stage === "complete") return successBanner;
    if (stage === "error") return errorBanner;
    return infoBanner;
  }, [stage]);

  async function selectPackage(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    setPackageState(null);
    setUploaded(0);
    setFailedPaths([]);
    setMappingProgress(0);
    setVerifiedPrompt(0);
    setVerifiedOption(0);

    try {
      const manifestFiles = selectedFiles.filter((file) =>
        /deployment_manifest\.json$/i.test(file.name),
      );
      if (manifestFiles.length !== 1) {
        throw new Error(
          `Expected one Deployment_Manifest.json file but found ${manifestFiles.length}. Select the complete extracted package folder.`,
        );
      }

      const manifestFile = manifestFiles[0];
      const parsed = JSON.parse(await manifestFile.text()) as DeploymentManifest;
      if (!parsed.batch || !parsed.bucket || !Array.isArray(parsed.assets) || !Array.isArray(parsed.mappings)) {
        throw new Error("The deployment manifest is incomplete or invalid.");
      }
      if (parsed.bucket !== "core-question-assets") {
        throw new Error(`Unsupported storage bucket: ${parsed.bucket}.`);
      }
      if ((parsed.failures?.length || 0) > 0 || Number(parsed.summary?.qc_failures || 0) > 0) {
        throw new Error("This package contains QC failures and cannot be deployed.");
      }
      if (parsed.assets.some((asset) => asset.qc_status && asset.qc_status !== "PASS")) {
        throw new Error("At least one asset has not passed QC.");
      }
      if (parsed.mappings.some((mapping) => mapping.qc_status && mapping.qc_status !== "PASS")) {
        throw new Error("At least one mapping has not passed QC.");
      }

      const inferred = inferPackage(parsed.batch);
      const filesByPath = new Map<string, File>();
      const candidateFiles = selectedFiles.filter((file) =>
        /\.(svg|png|jpe?g|webp)$/i.test(file.name),
      );

      for (const asset of parsed.assets) {
        const storagePath = normalisePath(asset.storage_path);
        const file = candidateFiles.find((candidate) =>
          normalisePath(candidate.webkitRelativePath || candidate.name).endsWith(storagePath),
        );
        if (file) filesByPath.set(storagePath, file);
      }

      const missing = parsed.assets.filter(
        (asset) => !filesByPath.has(normalisePath(asset.storage_path)),
      );
      if (missing.length) {
        throw new Error(
          `${missing.length} manifest asset(s) are missing from the selected folder. First missing file: ${missing[0].storage_path}`,
        );
      }

      setPackageState({
        manifest: parsed,
        manifestName: manifestFile.name,
        subject: inferred.subject,
        level: inferred.level,
        filesByPath,
      });
      setStage("ready");
      setMessage(
        `Package validated: ${parsed.assets.length} assets and ${parsed.mappings.length} mappings are ready.`,
      );
    } catch (error) {
      setStage("error");
      setMessage(error instanceof Error ? error.message : "Package validation failed.");
    }
  }

  async function uploadOne(
    token: string,
    asset: DeploymentAsset,
    file: File,
  ) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const form = new FormData();
        form.set("file", file);
        form.set("bucket", asset.storage_bucket);
        form.set("storage_path", normalisePath(asset.storage_path));
        form.set("subject", packageState!.subject);
        form.set("level", String(packageState!.level));
        const response = await fetch("/api/curriculum-developer/assets/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        await responseJson(response);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 5) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(8000, 700 * 2 ** (attempt - 1))));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Upload failed.");
  }

  async function uploadAssets(paths?: string[]) {
    if (!packageState) return;
    setStage("uploading");
    const assets = paths?.length
      ? packageState.manifest.assets.filter((asset) => paths.includes(asset.storage_path))
      : packageState.manifest.assets;
    setFailedPaths([]);
    if (!paths?.length) setUploaded(0);

    try {
      const token = await accessToken();
      const failures: string[] = [];
      let completedThisRun = 0;

      for (const asset of assets) {
        const path = normalisePath(asset.storage_path);
        const file = packageState.filesByPath.get(path);
        if (!file) {
          failures.push(path);
          continue;
        }
        setMessage(`Uploading ${completedThisRun + 1}/${assets.length}\n${path}`);
        try {
          await uploadOne(token, asset, file);
          completedThisRun++;
          setUploaded((value) => Math.min(totalAssets, value + 1));
        } catch {
          failures.push(path);
        }
      }

      setFailedPaths(failures);
      if (failures.length) {
        setStage("error");
        setMessage(`${failures.length} asset(s) could not be uploaded after five attempts. Use Retry failed files.`);
      } else {
        setUploaded(totalAssets);
        setStage("uploaded");
        setMessage(`Upload complete: ${totalAssets}/${totalAssets} assets. You may now apply the database mappings.`);
      }
    } catch (error) {
      setStage("error");
      setMessage(error instanceof Error ? error.message : "Asset upload failed.");
    }
  }

  async function mappingRequest(
    token: string,
    action: "apply" | "verify",
    mappings: DeploymentMapping[],
  ) {
    const response = await fetch("/api/curriculum-developer/assets/mappings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        subject: packageState!.subject,
        level: packageState!.level,
        batch: packageState!.manifest.batch,
        bucket: packageState!.manifest.bucket,
        mappings,
      }),
    });
    return responseJson(response);
  }

  async function applyAndVerifyMappings() {
    if (!packageState) return;
    const chunks = groupChunks(mappingGroups(packageState.manifest.mappings));
    try {
      const token = await accessToken();
      setStage("mapping");
      setMappingProgress(0);
      for (let index = 0; index < chunks.length; index++) {
        setMessage(`Applying database mappings ${index + 1}/${chunks.length}…`);
        await mappingRequest(token, "apply", chunks[index]);
        setMappingProgress(Math.round(((index + 1) / chunks.length) * 100));
      }

      setStage("verifying");
      let prompt = 0;
      let option = 0;
      const failures: string[] = [];
      for (let index = 0; index < chunks.length; index++) {
        setMessage(`Verifying database mappings ${index + 1}/${chunks.length}…`);
        const result = await mappingRequest(token, "verify", chunks[index]);
        prompt += Number(result.prompt_verified || 0);
        option += Number(result.option_verified || 0);
        failures.push(...(Array.isArray(result.failures) ? result.failures : []));
      }
      setVerifiedPrompt(prompt);
      setVerifiedOption(option);
      if (failures.length) throw new Error(`${failures.length} mapping(s) failed verification. First issue: ${failures[0]}`);

      setStage("complete");
      setMessage(`Deployment complete. Validated ${prompt} prompt mappings and ${option} option mappings.`);
    } catch (error) {
      setStage("error");
      setMessage(error instanceof Error ? error.message : "Database mapping failed.");
    }
  }

  const busy = ["uploading", "mapping", "verifying"].includes(stage);

  return (
    <div>
      <p style={eyebrow}>ADMIN DEPLOYMENT TOOL</p>
      <h1 style={title}>Quiz Image Deployment</h1>
      <p className="curriculum-page-description" style={description}>
        Validate, upload and connect generated Mathematics quiz images without using PowerShell or exposing the Supabase service-role key.
      </p>

      <div style={securityNote}>
        <strong>Admin only.</strong> Uploads pass through protected server routes. Deployment packages with missing files or QC failures are blocked automatically.
      </div>

      <section style={card}>
        <div style={stepHeader}><span style={stepNumber}>1</span><div><h2 style={stepTitle}>Select deployment package</h2><p style={stepText}>Extract the ZIP, then select its complete folder.</p></div></div>
        <input
          type="file"
          multiple
          disabled={busy}
          onChange={selectPackage}
          {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
          style={fileInput}
        />
      </section>

      {manifest && packageState && (
        <>
          <section style={card}>
            <div style={packageHeader}>
              <div><p style={eyebrow}>VALIDATED PACKAGE</p><h2 style={packageTitle}>{packageState.subject.toUpperCase()} P{packageState.level}</h2><p style={stepText}>{manifest.batch}</p></div>
              <span style={passPill}>QC PASSED</span>
            </div>
            <div style={statGrid}>
              <Stat label="Assets" value={manifest.assets.length} />
              <Stat label="Questions" value={manifest.summary.questions_requiring_images || 0} />
              <Stat label="Prompt mappings" value={manifest.summary.prompt_mappings || 0} />
              <Stat label="Option mappings" value={manifest.summary.option_mappings || 0} />
            </div>
          </section>

          <section style={card}>
            <div style={stepHeader}><span style={stepNumber}>2</span><div><h2 style={stepTitle}>Upload image assets</h2><p style={stepText}>Files are uploaded sequentially with automatic retries.</p></div></div>
            <div style={progressTrack}><div style={{ ...progressFill, width: `${progressPercent}%` }} /></div>
            <p style={progressLabel}>{uploaded}/{totalAssets} uploaded ({progressPercent}%)</p>
            <div style={buttonRow}>
              <button type="button" style={primaryButton} disabled={busy || !["ready", "error"].includes(stage) || failedPaths.length > 0} onClick={() => void uploadAssets()}>
                Upload {totalAssets} assets
              </button>
              <button type="button" style={secondaryButton} disabled={busy || failedPaths.length === 0} onClick={() => void uploadAssets(failedPaths)}>
                Retry {failedPaths.length} failed files
              </button>
            </div>
          </section>

          <section style={card}>
            <div style={stepHeader}><span style={stepNumber}>3</span><div><h2 style={stepTitle}>Apply and verify mappings</h2><p style={stepText}>Connect prompt and option images to the matching live questions.</p></div></div>
            <div style={buttonRow}>
              <button type="button" style={primaryButton} disabled={busy || uploaded !== totalAssets || failedPaths.length > 0} onClick={() => void applyAndVerifyMappings()}>
                Apply {totalMappings} mappings
              </button>
            </div>
            {mappingProgress > 0 && <p style={progressLabel}>Mapping progress: {mappingProgress}%</p>}
            {stage === "complete" && <p style={verifiedText}>Verified: {verifiedPrompt} prompt mappings and {verifiedOption} option mappings.</p>}
          </section>
        </>
      )}

      <div style={{ ...statusTone, whiteSpace: "pre-wrap" }}>{message}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div style={statCard}><span style={statLabel}>{label}</span><strong style={statValue}>{value}</strong></div>;
}

const eyebrow: CSSProperties = { margin: 0, color: "#7ee8ff", fontSize: "12px", fontWeight: 900, letterSpacing: "0.16em" };
const title: CSSProperties = { margin: "8px 0 8px", fontSize: "clamp(32px,5vw,54px)", lineHeight: 1.05 };
const description: CSSProperties = { margin: "0 0 22px", maxWidth: "850px", color: "rgba(255,255,255,0.66)" };
const securityNote: CSSProperties = { border: "1px solid rgba(255,215,106,0.3)", background: "rgba(255,215,106,0.08)", color: "#ffe6a8", borderRadius: "14px", padding: "14px 16px", marginBottom: "18px", lineHeight: 1.55 };
const card: CSSProperties = { border: "1px solid rgba(126,232,255,0.17)", background: "rgba(10,23,48,0.72)", borderRadius: "18px", padding: "20px", marginBottom: "16px" };
const stepHeader: CSSProperties = { display: "flex", alignItems: "flex-start", gap: "13px", marginBottom: "16px" };
const stepNumber: CSSProperties = { width: "32px", height: "32px", flex: "0 0 32px", display: "grid", placeItems: "center", borderRadius: "9px", background: "#7ee8ff", color: "#061225", fontWeight: 900 };
const stepTitle: CSSProperties = { margin: 0, fontSize: "20px" };
const stepText: CSSProperties = { margin: "5px 0 0", color: "rgba(255,255,255,0.58)", lineHeight: 1.5 };
const fileInput: CSSProperties = { width: "100%", border: "1px dashed rgba(126,232,255,0.38)", background: "rgba(126,232,255,0.05)", borderRadius: "13px", padding: "18px", color: "white" };
const packageHeader: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "flex-start", marginBottom: "16px" };
const packageTitle: CSSProperties = { margin: "6px 0 0", fontSize: "28px" };
const passPill: CSSProperties = { border: "1px solid rgba(52,211,153,0.45)", background: "rgba(52,211,153,0.12)", color: "#8ff0c5", borderRadius: "999px", padding: "8px 11px", fontSize: "11px", fontWeight: 900 };
const statGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "10px" };
const statCard: CSSProperties = { border: "1px solid rgba(126,232,255,0.12)", borderRadius: "12px", background: "rgba(255,255,255,0.03)", padding: "13px" };
const statLabel: CSSProperties = { display: "block", color: "rgba(255,255,255,0.55)", fontSize: "12px", marginBottom: "6px" };
const statValue: CSSProperties = { fontSize: "24px", color: "white" };
const progressTrack: CSSProperties = { height: "12px", borderRadius: "999px", overflow: "hidden", background: "rgba(255,255,255,0.08)" };
const progressFill: CSSProperties = { height: "100%", borderRadius: "999px", background: "linear-gradient(90deg,#22d3ee,#60a5fa)", transition: "width 180ms ease" };
const progressLabel: CSSProperties = { color: "rgba(255,255,255,0.7)", margin: "10px 0" };
const buttonRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "14px" };
const primaryButton: CSSProperties = { minHeight: "46px", borderRadius: "11px", border: "1px solid rgba(126,232,255,0.42)", background: "linear-gradient(135deg,#22d3ee,#3b82f6)", color: "#031326", padding: "0 17px", fontWeight: 900, cursor: "pointer" };
const secondaryButton: CSSProperties = { ...primaryButton, background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(126,232,255,0.22)" };
const infoBanner: CSSProperties = { border: "1px solid rgba(126,232,255,0.24)", background: "rgba(126,232,255,0.07)", color: "#dff8ff", borderRadius: "14px", padding: "15px", lineHeight: 1.55 };
const successBanner: CSSProperties = { ...infoBanner, border: "1px solid rgba(52,211,153,0.42)", background: "rgba(52,211,153,0.1)", color: "#a7f3d0", fontWeight: 800 };
const errorBanner: CSSProperties = { ...infoBanner, border: "1px solid rgba(248,113,113,0.42)", background: "rgba(239,68,68,0.11)", color: "#fecaca" };
const verifiedText: CSSProperties = { color: "#a7f3d0", fontWeight: 800 };
