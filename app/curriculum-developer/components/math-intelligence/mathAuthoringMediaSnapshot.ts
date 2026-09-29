import type { QuestionMediaDraft } from "@/app/curriculum-developer/media";

type JsonObject = Record<string, any>;

export function buildMathIntelligenceAuthoringMedia(
  media: QuestionMediaDraft,
) {
  const stimulusDraft = media.stimulus;
  const stimulus =
    stimulusDraft.mode === "none"
      ? null
      : {
          stimulus_type: stimulusDraft.type,
          title: stimulusDraft.title || null,
          body: stimulusDraft.bodyText ? { text: stimulusDraft.bodyText } : {},
          storage_bucket: stimulusDraft.existingBucket,
          storage_path:
            stimulusDraft.existingPath ||
            (stimulusDraft.file
              ? `authoring-file:${stimulusDraft.file.name}`
              : null),
          alt_text: stimulusDraft.altText || null,
          transcript: stimulusDraft.transcript || null,
        };

  const assets = media.assets
    .filter((asset) => !asset.removed)
    .map((asset) => ({
      id: asset.existingId || asset.localId,
      asset_type: asset.assetType,
      storage_bucket: asset.existingBucket,
      storage_path:
        asset.existingPath ||
        (asset.file ? `authoring-file:${asset.file.name}` : null),
      alt_text: asset.altText || null,
      caption: asset.caption || null,
    }));

  return { stimulus, assets };
}

export function applyMathIntelligenceAuthoringOptionImages(
  options: JsonObject[],
  media: QuestionMediaDraft,
) {
  return options.map((rawOption) => {
    const option = { ...rawOption };
    const optionId = String(option.id ?? "");
    const image = optionId ? media.optionImages[optionId] : null;
    if (!image) return option;

    if (image.removed) {
      delete option.image_url;
      delete option.image_bucket;
      delete option.image_path;
      delete option.image_alt;
      return option;
    }

    const imageUrl =
      image.existingUrl ||
      (image.file ? `authoring-file:${image.file.name}` : null) ||
      (image.existingPath
        ? `authoring-storage:${image.existingPath}`
        : null);

    if (imageUrl) option.image_url = imageUrl;
    if (image.existingBucket) option.image_bucket = image.existingBucket;
    if (image.existingPath) option.image_path = image.existingPath;
    if (image.altText) option.image_alt = image.altText;
    return option;
  });
}
