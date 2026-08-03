"use client";

import { supabase } from "@/lib/supabase";
import type {
  CoreMediaAssetType,
  CoreStimulusType,
  JsonObject,
  LinkedQuestion,
} from "./types";

export const CORE_MEDIA_BUCKET = "core-question-assets";

type CoreSubject = "english" | "math";

type MediaTableSet = {
  questions: "english_questions" | "math_questions";
  stimuli: "english_stimuli" | "math_stimuli";
  questionAssets:
    | "english_question_assets"
    | "math_question_assets";
};

const ALL_STIMULUS_TABLES = [
  "english_stimuli",
  "math_stimuli",
] as const;

function mediaTablesFor(subject: CoreSubject): MediaTableSet {
  if (subject === "english") {
    return {
      questions: "english_questions",
      stimuli: "english_stimuli",
      questionAssets: "english_question_assets",
    };
  }

  return {
    questions: "math_questions",
    stimuli: "math_stimuli",
    questionAssets: "math_question_assets",
  };
}

export type StimulusEditorMode = "none" | "text" | "media";

export type StimulusDraft = {
  mode: StimulusEditorMode;
  existingId: string | null;
  type: CoreStimulusType;
  title: string;
  bodyText: string;
  altText: string;
  transcript: string;
  existingBucket: string | null;
  existingPath: string | null;
  file: File | null;
  dirty: boolean;
};

export type QuestionAssetDraft = {
  localId: string;
  existingId: string | null;
  assetType: CoreMediaAssetType;
  existingBucket: string | null;
  existingPath: string | null;
  file: File | null;
  altText: string;
  caption: string;
  objectFit: "contain" | "cover";
  removed: boolean;
};

export type OptionImageDraft = {
  optionId: string;
  existingUrl: string | null;
  existingBucket: string | null;
  existingPath: string | null;
  file: File | null;
  altText: string;
  removed: boolean;
};

export type QuestionMediaDraft = {
  stimulus: StimulusDraft;
  assets: QuestionAssetDraft[];
  optionImages: Record<string, OptionImageDraft>;
};

export type SyncQuestionMediaInput = {
  questionId: string;
  questionCode: string;
  subject: CoreSubject;
  primaryLevel: number;
  content: JsonObject;
  media: QuestionMediaDraft;
};

export function emptyQuestionMediaDraft(): QuestionMediaDraft {
  return {
    stimulus: {
      mode: "none",
      existingId: null,
      type: "passage",
      title: "",
      bodyText: "",
      altText: "",
      transcript: "",
      existingBucket: null,
      existingPath: null,
      file: null,
      dirty: false,
    },
    assets: [],
    optionImages: {},
  };
}

export function questionMediaDraftFromQuestion(
  question: LinkedQuestion | null,
): QuestionMediaDraft {
  if (!question) return emptyQuestionMediaDraft();

  const stimulus = question.stimulus;
  const stimulusMode: StimulusEditorMode = !stimulus
    ? "none"
    : ["passage", "visual_text", "table"].includes(stimulus.stimulus_type)
      ? "text"
      : "media";

  const options = Array.isArray(question.content?.options)
    ? question.content.options
    : [];

  const optionImages: Record<string, OptionImageDraft> = {};
  for (const rawOption of options) {
    const option = rawOption as JsonObject;
    const optionId = String(option.id ?? "");
    if (!optionId) continue;

    const existingUrl = option.image_url ? String(option.image_url) : null;
    const existingBucket = option.image_bucket
      ? String(option.image_bucket)
      : null;
    const existingPath = option.image_path ? String(option.image_path) : null;

    if (existingUrl || existingPath) {
      optionImages[optionId] = {
        optionId,
        existingUrl,
        existingBucket,
        existingPath,
        file: null,
        altText: String(option.image_alt ?? option.text ?? "Answer option image"),
        removed: false,
      };
    }
  }

  return {
    stimulus: stimulus
      ? {
          mode: stimulusMode,
          existingId: stimulus.id,
          type: stimulus.stimulus_type,
          title: stimulus.title || "",
          bodyText: String(
            stimulus.body?.text ??
              stimulus.body?.content ??
              stimulus.body?.passage ??
              "",
          ),
          altText: stimulus.alt_text || "",
          transcript: stimulus.transcript || "",
          existingBucket: stimulus.storage_bucket,
          existingPath: stimulus.storage_path,
          file: null,
          dirty: false,
        }
      : emptyQuestionMediaDraft().stimulus,
    assets: (question.assets || []).map((asset) => ({
      localId: asset.id,
      existingId: asset.id,
      assetType: asset.asset_type,
      existingBucket: asset.storage_bucket,
      existingPath: asset.storage_path,
      file: null,
      altText: asset.alt_text || "",
      caption: asset.caption || "",
      objectFit:
        String(asset.metadata?.object_fit || "contain") === "cover"
          ? "cover"
          : "contain",
      removed: false,
    })),
    optionImages,
  };
}

export function publicMediaUrl(
  bucket: string | null | undefined,
  path: string | null | undefined,
) {
  if (!bucket || !path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function assetTypeFromFile(file: File): CoreMediaAssetType {
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
    return "svg";
  }
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  throw new Error(`Unsupported media file: ${file.name}`);
}

function sanitiseSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "file";
}

function mediaPath({
  subject,
  primaryLevel,
  questionCode,
  group,
  file,
}: {
  subject: string;
  primaryLevel: number;
  questionCode: string;
  group: string;
  file: File;
}) {
  const random = Math.random().toString(36).slice(2, 9);
  const filename = sanitiseSegment(file.name);
  return `${sanitiseSegment(subject)}/p${primaryLevel}/${sanitiseSegment(
    questionCode,
  )}/${sanitiseSegment(group)}/${Date.now()}-${random}-${filename}`;
}

async function uploadFile(path: string, file: File) {
  const { error } = await supabase.storage
    .from(CORE_MEDIA_BUCKET)
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
      cacheControl: "3600",
    });

  if (error) throw error;
  return path;
}

async function removeStoredFile(
  bucket: string | null | undefined,
  path: string | null | undefined,
) {
  if (!bucket || !path) return;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.warn("Could not remove old curriculum media file:", error.message);
}

function stimulusBody(draft: StimulusDraft): JsonObject {
  if (["passage", "visual_text", "table"].includes(draft.type)) {
    return { text: draft.bodyText.trim() };
  }
  return {};
}

function stimulusNeedsFile(type: CoreStimulusType) {
  return ["image", "audio", "video", "diagram", "graph"].includes(type);
}

function mediaFileIsCompatible(type: CoreStimulusType, file: File) {
  if (["image", "diagram", "graph"].includes(type)) {
    return file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".svg");
  }
  if (type === "audio") return file.type.startsWith("audio/");
  if (type === "video") return file.type.startsWith("video/");
  return true;
}

async function removeStimulusFileIfUnreferenced(
  bucket: string | null | undefined,
  path: string | null | undefined,
) {
  if (!bucket || !path) return;

  const checks = await Promise.all(
    ALL_STIMULUS_TABLES.map((table) =>
      supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("storage_bucket", bucket)
        .eq("storage_path", path),
    ),
  );

  const firstError = checks.find((result) => result.error)?.error;
  if (firstError) {
    console.warn(
      "Could not verify shared stimulus file usage:",
      firstError.message,
    );
    return;
  }

  const totalReferences = checks.reduce(
    (sum, result) => sum + Number(result.count || 0),
    0,
  );

  if (totalReferences === 0) {
    await removeStoredFile(bucket, path);
  }
}

function stimulusFileKind(type: CoreStimulusType) {
  if (["image", "diagram", "graph"].includes(type)) return "image";
  if (type === "audio") return "audio";
  if (type === "video") return "video";
  return "text";
}

async function syncStimulus({
  questionId,
  questionCode,
  subject,
  primaryLevel,
  draft,
}: {
  questionId: string;
  questionCode: string;
  subject: CoreSubject;
  primaryLevel: number;
  draft: StimulusDraft;
}) {
  const tables = mediaTablesFor(subject);

  const { data: questionRow, error: questionError } = await supabase
    .from(tables.questions)
    .select("stimulus_id")
    .eq("id", questionId)
    .single();

  if (questionError) throw questionError;

  const oldStimulusId = questionRow?.stimulus_id
    ? String(questionRow.stimulus_id)
    : null;

  if (draft.mode === "none") {
    const { error } = await supabase
      .from(tables.questions)
      .update({ stimulus_id: null })
      .eq("id", questionId);
    if (error) throw error;

    await removeUnusedStimulus(subject, oldStimulusId);
    return null;
  }

  if (draft.mode === "text" && !draft.bodyText.trim()) {
    throw new Error("Enter the shared passage or visual-text content.");
  }

  // An unchanged existing stimulus can simply be attached. This also makes it
  // safe to support reusing the same stimulus across several questions later.
  if (draft.existingId && !draft.dirty) {
    const { error } = await supabase
      .from(tables.questions)
      .update({ stimulus_id: draft.existingId })
      .eq("id", questionId);
    if (error) throw error;

    if (oldStimulusId && oldStimulusId !== draft.existingId) {
      await removeUnusedStimulus(subject, oldStimulusId);
    }
    return draft.existingId;
  }

  let existingStimulus: {
    id: string;
    stimulus_type: CoreStimulusType;
    storage_bucket: string | null;
    storage_path: string | null;
  } | null = null;

  if (draft.existingId) {
    const { data, error } = await supabase
      .from(tables.stimuli)
      .select("id, stimulus_type, storage_bucket, storage_path")
      .eq("id", draft.existingId)
      .maybeSingle();
    if (error) throw error;
    existingStimulus = data
      ? {
          id: String(data.id),
          stimulus_type: data.stimulus_type as CoreStimulusType,
          storage_bucket: data.storage_bucket
            ? String(data.storage_bucket)
            : null,
          storage_path: data.storage_path ? String(data.storage_path) : null,
        }
      : null;
  }

  let storageBucket: string | null = null;
  let storagePath: string | null = null;

  if (stimulusNeedsFile(draft.type)) {
    const previousType = existingStimulus?.stimulus_type;
    const canReuseExistingFile =
      Boolean(existingStimulus?.storage_path) &&
      previousType !== undefined &&
      stimulusFileKind(previousType) === stimulusFileKind(draft.type);

    if (canReuseExistingFile) {
      storageBucket = existingStimulus?.storage_bucket || draft.existingBucket;
      storagePath = existingStimulus?.storage_path || draft.existingPath;
    }
  }

  if (draft.file) {
    if (!mediaFileIsCompatible(draft.type, draft.file)) {
      throw new Error(
        `The selected file does not match the ${draft.type} stimulus type.`,
      );
    }
    const nextPath = mediaPath({
      subject,
      primaryLevel,
      questionCode,
      group: "stimulus",
      file: draft.file,
    });
    await uploadFile(nextPath, draft.file);
    storageBucket = CORE_MEDIA_BUCKET;
    storagePath = nextPath;
  }

  if (stimulusNeedsFile(draft.type) && !storagePath) {
    throw new Error("Upload a file for the selected shared stimulus.");
  }

  const row = {
    subject,
    primary_level: primaryLevel,
    stimulus_type: draft.type,
    title: draft.title.trim() || null,
    body: stimulusBody(draft),
    storage_bucket: stimulusNeedsFile(draft.type) ? storageBucket : null,
    storage_path: stimulusNeedsFile(draft.type) ? storagePath : null,
    alt_text: draft.altText.trim() || null,
    transcript: draft.transcript.trim() || null,
    is_active: true,
  };

  let stimulusId = draft.existingId;
  let updateExisting = Boolean(stimulusId && existingStimulus);

  if (stimulusId) {
    const { count, error: countError } = await supabase
      .from(tables.questions)
      .select("id", { count: "exact", head: true })
      .eq("stimulus_id", stimulusId);
    if (countError) throw countError;

    // Clone a stimulus before editing when another question also uses it.
    if ((count || 0) > 1) {
      updateExisting = false;
      stimulusId = null;
    }
  }

  if (updateExisting && stimulusId) {
    const { error } = await supabase
      .from(tables.stimuli)
      .update(row)
      .eq("id", stimulusId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from(tables.stimuli)
      .insert(row)
      .select("id")
      .single();
    if (error || !data) {
      throw error || new Error("Could not create the stimulus.");
    }
    stimulusId = String(data.id);
  }

  const { error: attachError } = await supabase
    .from(tables.questions)
    .update({ stimulus_id: stimulusId })
    .eq("id", questionId);
  if (attachError) throw attachError;

  // Remove a replaced file only when no other stimulus row still references it.
  if (
    updateExisting &&
    existingStimulus?.storage_path &&
    (existingStimulus.storage_bucket !== row.storage_bucket ||
      existingStimulus.storage_path !== row.storage_path)
  ) {
    await removeStimulusFileIfUnreferenced(
      existingStimulus.storage_bucket,
      existingStimulus.storage_path,
    );
  }

  if (oldStimulusId && oldStimulusId !== stimulusId) {
    await removeUnusedStimulus(subject, oldStimulusId);
  }

  return stimulusId;
}

async function removeUnusedStimulus(
  subject: CoreSubject,
  stimulusId: string | null,
) {
  if (!stimulusId) return;

  const tables = mediaTablesFor(subject);

  const { count, error: countError } = await supabase
    .from(tables.questions)
    .select("id", { count: "exact", head: true })
    .eq("stimulus_id", stimulusId);
  if (countError || (count || 0) > 0) return;

  const { data } = await supabase
    .from(tables.stimuli)
    .select("storage_bucket,storage_path")
    .eq("id", stimulusId)
    .maybeSingle();

  const { error: deleteError } = await supabase
    .from(tables.stimuli)
    .delete()
    .eq("id", stimulusId);

  if (!deleteError && data) {
    await removeStimulusFileIfUnreferenced(
      data.storage_bucket,
      data.storage_path,
    );
  }
}

async function syncAssets({
  questionId,
  questionCode,
  subject,
  primaryLevel,
  assets,
}: {
  questionId: string;
  questionCode: string;
  subject: CoreSubject;
  primaryLevel: number;
  assets: QuestionAssetDraft[];
}) {
  const tables = mediaTablesFor(subject);

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];

    if (asset.existingId && asset.removed) {
      const { error } = await supabase
        .from(tables.questionAssets)
        .delete()
        .eq("id", asset.existingId)
        .eq("question_id", questionId);
      if (error) throw error;
      await removeStoredFile(asset.existingBucket, asset.existingPath);
      continue;
    }

    if (asset.existingId) {
      let bucket = asset.existingBucket;
      let path = asset.existingPath;

      if (asset.file) {
        const nextPath = mediaPath({
          subject,
          primaryLevel,
          questionCode,
          group: "assets",
          file: asset.file,
        });
        await uploadFile(nextPath, asset.file);
        bucket = CORE_MEDIA_BUCKET;
        path = nextPath;
      }

      const { error } = await supabase
        .from(tables.questionAssets)
        .update({
          asset_type: asset.file ? assetTypeFromFile(asset.file) : asset.assetType,
          storage_bucket: bucket,
          storage_path: path,
          alt_text: asset.altText.trim() || null,
          caption: asset.caption.trim() || null,
          metadata: { object_fit: asset.objectFit, placement: "above_prompt" },
          sort_order: index,
        })
        .eq("id", asset.existingId)
        .eq("question_id", questionId);
      if (error) throw error;

      if (asset.file && asset.existingPath && asset.existingPath !== path) {
        await removeStoredFile(asset.existingBucket, asset.existingPath);
      }
      continue;
    }

    if (!asset.removed && asset.file) {
      const path = mediaPath({
        subject,
        primaryLevel,
        questionCode,
        group: "assets",
        file: asset.file,
      });
      await uploadFile(path, asset.file);

      const { error } = await supabase.from(tables.questionAssets).insert({
        question_id: questionId,
        asset_type: assetTypeFromFile(asset.file),
        storage_bucket: CORE_MEDIA_BUCKET,
        storage_path: path,
        alt_text: asset.altText.trim() || null,
        caption: asset.caption.trim() || null,
        metadata: { object_fit: asset.objectFit, placement: "above_prompt" },
        sort_order: index,
      });
      if (error) throw error;
    }
  }
}

async function syncOptionImages({
  questionCode,
  subject,
  primaryLevel,
  content,
  optionImages,
}: {
  questionCode: string;
  subject: CoreSubject;
  primaryLevel: number;
  content: JsonObject;
  optionImages: Record<string, OptionImageDraft>;
}) {
  if (!Array.isArray(content.options)) return content;

  const nextOptions: JsonObject[] = [];

  for (const rawOption of content.options) {
    const option = { ...(rawOption as JsonObject) };
    const optionId = String(option.id ?? "");
    const draft = optionImages[optionId];

    if (!draft || draft.removed) {
      if (draft?.removed) {
        await removeStoredFile(draft.existingBucket, draft.existingPath);
      }
      delete option.image_url;
      delete option.image_bucket;
      delete option.image_path;
      delete option.image_alt;
      nextOptions.push(option);
      continue;
    }

    if (draft.file) {
      if (!draft.file.type.startsWith("image/") && !draft.file.name.toLowerCase().endsWith(".svg")) {
        throw new Error(`Option ${optionId.toUpperCase()} needs an image file.`);
      }

      const path = mediaPath({
        subject,
        primaryLevel,
        questionCode,
        group: `option-${optionId}`,
        file: draft.file,
      });
      await uploadFile(path, draft.file);

      option.image_bucket = CORE_MEDIA_BUCKET;
      option.image_path = path;
      option.image_url = publicMediaUrl(CORE_MEDIA_BUCKET, path);
      option.image_alt = draft.altText.trim() || option.text || "Answer option image";

      if (draft.existingPath && draft.existingPath !== path) {
        await removeStoredFile(draft.existingBucket, draft.existingPath);
      }
    } else if (draft.existingUrl || draft.existingPath) {
      option.image_bucket = draft.existingBucket || CORE_MEDIA_BUCKET;
      option.image_path = draft.existingPath;
      option.image_url =
        draft.existingUrl ||
        publicMediaUrl(option.image_bucket, option.image_path);
      option.image_alt = draft.altText.trim() || option.text || "Answer option image";
    }

    nextOptions.push(option);
  }

  return { ...content, options: nextOptions };
}

export async function syncQuestionMedia(input: SyncQuestionMediaInput) {
  const tables = mediaTablesFor(input.subject);

  const contentWithOptionImages = await syncOptionImages({
    questionCode: input.questionCode,
    subject: input.subject,
    primaryLevel: input.primaryLevel,
    content: input.content,
    optionImages: input.media.optionImages,
  });

  const stimulusId = await syncStimulus({
    questionId: input.questionId,
    questionCode: input.questionCode,
    subject: input.subject,
    primaryLevel: input.primaryLevel,
    draft: input.media.stimulus,
  });

  const { error: contentError } = await supabase
    .from(tables.questions)
    .update({
      content: contentWithOptionImages,
      stimulus_id: stimulusId,
    })
    .eq("id", input.questionId);
  if (contentError) throw contentError;

  await syncAssets({
    questionId: input.questionId,
    questionCode: input.questionCode,
    subject: input.subject,
    primaryLevel: input.primaryLevel,
    assets: input.media.assets,
  });

  return contentWithOptionImages;
}
