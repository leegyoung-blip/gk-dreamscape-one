import type {
  MathCanvas,
  MathCoordinate,
  MathPositionRef,
  MathVisualObject,
  MathVisualStyle,
} from "../MathVisualTypes";
import type { MathVisualObjectRuntimeState } from "../MathVisualState";
import {
  isRuntimeHidden,
  PrimitiveAnnotation,
  resolvePosition,
  runtimeDataAttributes,
  type PrimitiveObjectMap,
  type PrimitivePointMap,
} from "../primitives/PrimitiveRenderUtils";

export type SemanticCommonProps<T extends MathVisualObject> = {
  object: T;
  visualId: string;
  points: PrimitivePointMap;
  objectsById: PrimitiveObjectMap;
  runtimeState?: MathVisualObjectRuntimeState;
  canvas?: MathCanvas;
};

export function childObjectId(parentId: string, child: string | number) {
  return `${parentId}__${String(child).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function mergeStyle(
  base: MathVisualStyle | undefined,
  patch: MathVisualStyle = {},
): MathVisualStyle {
  return { ...(base || {}), ...patch };
}

/**
 * Semantic objects apply teaching state to their internal primitive children,
 * but render the annotation only once at the semantic-object level.
 */
export function childRuntimeState(
  state?: MathVisualObjectRuntimeState,
  patch: Partial<MathVisualObjectRuntimeState> = {},
): MathVisualObjectRuntimeState | undefined {
  if (!state && Object.keys(patch).length === 0) return undefined;
  return {
    ...(state || {}),
    annotation: null,
    ...patch,
  };
}

export function SemanticObjectGroup({
  object,
  visualId,
  runtimeState,
  annotationAnchor,
  children,
}: {
  object: MathVisualObject;
  visualId: string;
  runtimeState?: MathVisualObjectRuntimeState;
  annotationAnchor?: MathCoordinate | null;
  children: any;
}) {
  if (isRuntimeHidden(runtimeState)) return null;

  return (
    <g
      data-math-visual-id={visualId}
      data-math-object-id={object.id}
      data-math-object-type={object.type}
      aria-label={object.aria_label}
      {...runtimeDataAttributes(runtimeState)}
    >
      {children}
      {annotationAnchor && (
        <PrimitiveAnnotation
          text={runtimeState?.annotation?.text}
          anchor={annotationAnchor}
        />
      )}
    </g>
  );
}

export function resolvePositions(
  refs: MathPositionRef[],
  points: PrimitivePointMap,
): MathCoordinate[] {
  return refs
    .map((ref) => resolvePosition(ref, points))
    .filter((point): point is MathCoordinate => Boolean(point));
}

export function centroid(points: MathCoordinate[]): MathCoordinate {
  if (points.length === 0) return { x: 0, y: 0 };
  return points.reduce(
    (sum, point) => ({
      x: sum.x + point.x / points.length,
      y: sum.y + point.y / points.length,
    }),
    { x: 0, y: 0 },
  );
}

export function labelPointOutsideVertex(
  vertex: MathCoordinate,
  center: MathCoordinate,
  distance = 17,
) {
  const dx = vertex.x - center.x;
  const dy = vertex.y - center.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: vertex.x + (dx / length) * distance,
    y: vertex.y + (dy / length) * distance + 5,
  };
}

export type ObjectBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function boundsFromPoints(points: MathCoordinate[]): ObjectBounds | null {
  if (points.length === 0) return null;
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

export function unionBounds(bounds: Array<ObjectBounds | null>): ObjectBounds | null {
  const valid = bounds.filter((item): item is ObjectBounds => Boolean(item));
  if (valid.length === 0) return null;
  return {
    minX: Math.min(...valid.map((item) => item.minX)),
    minY: Math.min(...valid.map((item) => item.minY)),
    maxX: Math.max(...valid.map((item) => item.maxX)),
    maxY: Math.max(...valid.map((item) => item.maxY)),
  };
}

export function objectBounds(
  object: MathVisualObject,
  points: PrimitivePointMap,
  objectsById?: PrimitiveObjectMap,
  visited: Set<string> = new Set(),
): ObjectBounds | null {
  if (visited.has(object.id)) return null;
  visited.add(object.id);

  switch (object.type) {
    case "point":
      return { minX: object.x, minY: object.y, maxX: object.x, maxY: object.y };
    case "line":
    case "arrow":
    case "dimension": {
      const resolved = resolvePositions([object.from, object.to], points);
      return boundsFromPoints(resolved);
    }
    case "text":
      return {
        minX: object.x - 8,
        minY: object.y - 20,
        maxX: object.x + Math.max(18, object.text.length * 10),
        maxY: object.y + 8,
      };
    case "rectangle":
    case "grid":
    case "fraction_bar":
    case "fraction_grid":
    case "bar_chart":
    case "line_graph":
    case "bar_model":
      return {
        minX: object.x,
        minY: object.y,
        maxX: object.x + object.width,
        maxY: object.y + object.height,
      };
    case "polygon":
    case "triangle":
    case "quadrilateral":
      return boundsFromPoints(resolvePositions(object.points, points));
    case "circle":
    case "pie_chart":
    case "clock":
      return {
        minX: object.cx - object.radius,
        minY: object.cy - object.radius,
        maxX: object.cx + object.radius,
        maxY: object.cy + object.radius,
      };
    case "arc":
      return {
        minX: object.center.x - object.radius,
        minY: object.center.y - object.radius,
        maxX: object.center.x + object.radius,
        maxY: object.center.y + object.radius,
      };
    case "shade":
      if (object.points) return boundsFromPoints(resolvePositions(object.points, points));
      if (object.target_id && objectsById?.has(object.target_id)) {
        return objectBounds(objectsById.get(object.target_id)!, points, objectsById, visited);
      }
      return null;
    case "angle_marker":
    case "right_angle_marker":
      return boundsFromPoints(resolvePositions([object.a, object.vertex, object.b], points));
    case "axis":
      return boundsFromPoints([object.from, object.to]);
    case "composite_shape":
      return unionBounds(
        object.component_ids.map((id) => {
          const child = objectsById?.get(id);
          return child ? objectBounds(child, points, objectsById, visited) : null;
        }),
      );
    case "number_line":
      return {
        minX: object.x,
        minY: object.y - 35,
        maxX: object.x + object.width,
        maxY: object.y + 40,
      };
    case "cube": {
      const renderSize = 150;
      const depth = Math.max(20, Math.min(80, Number(object.depth ?? 46)));
      return {
        minX: object.x,
        minY: object.y - depth * 0.65,
        maxX: object.x + renderSize + depth,
        maxY: object.y + renderSize,
      };
    }
    case "cuboid": {
      const maxValue = Math.max(object.length, object.width, object.height, 1);
      const scale = 175 / maxValue;
      const frontWidth = Math.max(80, object.length * scale);
      const frontHeight = Math.max(65, object.height * scale);
      const depthX = Math.max(28, Math.min(78, object.width * scale * 0.52));
      const depthY = depthX * 0.58;
      return {
        minX: object.x,
        minY: object.y,
        maxX: object.x + frontWidth + depthX,
        maxY: object.y + depthY + frontHeight,
      };
    }
    case "net":
      return unionBounds(
        object.faces.map((face) => ({
          minX: face.x,
          minY: face.y,
          maxX: face.x + face.width,
          maxY: face.y + face.height,
        })),
      );
    case "table": {
      const x = Number(object.x ?? 30);
      const y = Number(object.y ?? 30);
      const width = Number(object.width ?? 620);
      const rows = Math.max(1, object.rows.length + 1);
      const height = Number(object.height ?? Math.max(90, rows * 48));
      return { minX: x, minY: y, maxX: x + width, maxY: y + height };
    }
  }
}

export function boundsCenter(bounds: ObjectBounds): MathCoordinate {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

export function defaultCanvasBox(canvas?: MathCanvas) {
  const width = Math.max(160, Number(canvas?.width ?? 720));
  const height = Math.max(120, Number(canvas?.height ?? 360));
  const padding = Math.max(0, Number(canvas?.padding ?? 28));
  return {
    x: padding,
    y: padding,
    width: Math.max(80, width - padding * 2),
    height: Math.max(70, height - padding * 2),
  };
}

export function isMeaningfulSemanticRuntimeState(state?: MathVisualObjectRuntimeState) {
  return Boolean(
    state?.highlighted ||
      state?.dimmed ||
      state?.shaded !== undefined ||
      state?.emphasised ||
      state?.traced ||
      state?.revealed ||
      state?.annotation?.text,
  );
}
