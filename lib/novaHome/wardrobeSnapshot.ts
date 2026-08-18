import { getRigTargetBox, type WardrobeRig } from "@/lib/novaHome/wardrobeRig";

export type SnapshotAccessoryPlacement = {
  scale: number;
  offset_x_pct: number;
  offset_y_pct: number;
};

export type SnapshotWardrobeItem = {
  item_key: string;
  category: "outfit" | "top" | "bottom" | "shoes" | "accessory";
  accessory_slot?: "head" | "face" | "ears" | "wrist" | "companion" | "effect" | null;
  layer_image: string | null;
  layer_order: number;
  fit_scale?: number | null;
  fit_scale_x?: number | null;
  fit_scale_y?: number | null;
  fit_offset_x_pct?: number | null;
  fit_offset_y_pct?: number | null;
  fit_rotation_deg?: number | null;
  fit_skew_x_deg?: number | null;
  fit_skew_y_deg?: number | null;
  fit_stretch_mode?: "contain" | "stretch" | string | null;
};

type AlphaBounds = {
  imageWidth: number;
  imageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const alphaBoundsCache = new Map<string, Promise<AlphaBounds>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  }).catch((error) => {
    imageCache.delete(src);
    throw error;
  });

  imageCache.set(src, promise);
  return promise;
}

async function detectAlphaBounds(src: string): Promise<AlphaBounds> {
  const cached = alphaBoundsCache.get(src);
  if (cached) return cached;

  const promise = (async () => {
    const image = await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || 1;
    canvas.height = image.naturalHeight || 1;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return {
        imageWidth: canvas.width,
        imageHeight: canvas.height,
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      };
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    try {
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < canvas.height; y += 1) {
        const rowOffset = y * canvas.width * 4;
        for (let x = 0; x < canvas.width; x += 1) {
          const alpha = data[rowOffset + x * 4 + 3];
          if (alpha <= 8) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      if (maxX >= minX && maxY >= minY) {
        return {
          imageWidth: canvas.width,
          imageHeight: canvas.height,
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        };
      }
    } catch (error) {
      console.warn("Snapshot alpha bounds fallback:", src, error);
    }

    return {
      imageWidth: canvas.width,
      imageHeight: canvas.height,
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    };
  })().catch((error) => {
    alphaBoundsCache.delete(src);
    throw error;
  });

  alphaBoundsCache.set(src, promise);
  return promise;
}

function drawContainedBottom(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  size: number,
) {
  const naturalWidth = Math.max(1, image.naturalWidth);
  const naturalHeight = Math.max(1, image.naturalHeight);
  const scale = Math.min(size / naturalWidth, size / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  const left = (size - width) / 2;
  const top = size - height;
  context.drawImage(image, left, top, width, height);
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

async function drawAccessory(
  context: CanvasRenderingContext2D,
  item: SnapshotWardrobeItem,
  rig: WardrobeRig,
  placement: SnapshotAccessoryPlacement | undefined,
  size: number,
) {
  const src = item.layer_image || "";
  if (!src) return;

  const [image, bounds] = await Promise.all([loadImage(src), detectAlphaBounds(src)]);
  const target = getRigTargetBox(rig, item.category);

  const userScale = Number(placement?.scale ?? 1) || 1;
  const userOffsetX = Number(placement?.offset_x_pct ?? 0) || 0;
  const userOffsetY = Number(placement?.offset_y_pct ?? 0) || 0;

  const uniformScale = (Number(item.fit_scale ?? 1) || 1) * userScale;
  const scaleX = Number(item.fit_scale_x ?? 1) || 1;
  const scaleY = Number(item.fit_scale_y ?? 1) || 1;
  const offsetX = ((Number(item.fit_offset_x_pct ?? 0) || 0) + userOffsetX) / 100;
  const offsetY = ((Number(item.fit_offset_y_pct ?? 0) || 0) + userOffsetY) / 100;
  const rotation = Number(item.fit_rotation_deg ?? 0) || 0;
  const skewX = Number(item.fit_skew_x_deg ?? 0) || 0;
  const skewY = Number(item.fit_skew_y_deg ?? 0) || 0;
  const stretchMode = item.fit_stretch_mode === "stretch" ? "stretch" : "contain";

  const containScale = Math.min(target.width / bounds.width, target.height / bounds.height);
  const baseScaleX = stretchMode === "stretch" ? target.width / bounds.width : containScale;
  const baseScaleY = stretchMode === "stretch" ? target.height / bounds.height : containScale;
  const sourceToStageX = baseScaleX * uniformScale * scaleX;
  const sourceToStageY = baseScaleY * uniformScale * scaleY;

  const renderedImageWidth = bounds.imageWidth * sourceToStageX * size;
  const renderedImageHeight = bounds.imageHeight * sourceToStageY * size;
  const targetCenterX = target.x + target.width / 2 + offsetX;
  const targetCenterY = target.y + target.height / 2 + offsetY;
  const alphaCenterX = bounds.x + bounds.width / 2;
  const alphaCenterY = bounds.y + bounds.height / 2;

  const left = (targetCenterX - alphaCenterX * sourceToStageX) * size;
  const top = (targetCenterY - alphaCenterY * sourceToStageY) * size;
  const centerX = left + renderedImageWidth / 2;
  const centerY = top + renderedImageHeight / 2;

  context.save();
  context.translate(centerX, centerY);
  context.rotate(degreesToRadians(rotation));
  context.transform(
    1,
    Math.tan(degreesToRadians(skewY)),
    Math.tan(degreesToRadians(skewX)),
    1,
    0,
    0,
  );
  context.drawImage(
    image,
    -renderedImageWidth / 2,
    -renderedImageHeight / 2,
    renderedImageWidth,
    renderedImageHeight,
  );
  context.restore();
}

export async function createWardrobeSnapshotPng({
  outfit,
  accessories,
  placements,
  rig,
  size = 2048,
}: {
  outfit: SnapshotWardrobeItem;
  accessories: SnapshotWardrobeItem[];
  placements: Record<string, SnapshotAccessoryPlacement | undefined>;
  rig: WardrobeRig;
  size?: number;
}): Promise<Blob> {
  if (!outfit.layer_image) {
    throw new Error("The equipped outfit does not have an image.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.clearRect(0, 0, size, size);

  const sortedAccessories = [...accessories].sort((a, b) => a.layer_order - b.layer_order);
  const backdrop = sortedAccessories.filter((item) => item.accessory_slot === "effect");
  const foreground = sortedAccessories.filter((item) => item.accessory_slot !== "effect");

  for (const item of backdrop) {
    await drawAccessory(context, item, rig, placements[item.item_key], size);
  }

  const outfitImage = await loadImage(outfit.layer_image);
  drawContainedBottom(context, outfitImage, size);

  for (const item of foreground) {
    await drawAccessory(context, item, rig, placements[item.item_key], size);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create the PNG snapshot."));
      },
      "image/png",
      1,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
