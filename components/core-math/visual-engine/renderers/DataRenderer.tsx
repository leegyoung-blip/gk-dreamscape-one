import type {
  MathAxisObject,
  MathBarChartObject,
  MathLineGraphObject,
  MathLineObject,
  MathPieChartObject,
  MathPointObject,
  MathPolygonObject,
  MathRectangleObject,
  MathTextObject,
  MathVisualTone,
} from "../MathVisualTypes";
import AxisPrimitive from "../primitives/Axis";
import LinePrimitive from "../primitives/Line";
import PointPrimitive from "../primitives/Point";
import PolygonPrimitive from "../primitives/Polygon";
import RectanglePrimitive from "../primitives/Rectangle";
import TextPrimitive from "../primitives/Text";
import {
  childObjectId,
  childRuntimeState,
  mergeStyle,
  SemanticObjectGroup,
  type SemanticCommonProps,
} from "./SemanticRenderUtils";

export type DataSemanticObject = MathBarChartObject | MathLineGraphObject | MathPieChartObject;

const DATA_TONES: MathVisualTone[] = [
  "accent",
  "success",
  "warning",
  "danger",
  "muted",
  "default",
];

export default function DataRenderer(props: SemanticCommonProps<DataSemanticObject>) {
  if (props.object.type === "bar_chart") return renderBarChart(props as SemanticCommonProps<MathBarChartObject>);
  if (props.object.type === "line_graph") return renderLineGraph(props as SemanticCommonProps<MathLineGraphObject>);
  return renderPieChart(props as SemanticCommonProps<MathPieChartObject>);
}

function renderBarChart({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<MathBarChartObject>) {
  if (object.data.length === 0) return null;

  const values = object.data.map((item) => item.value).filter(Number.isFinite);
  const inferredMin = Math.min(0, ...values);
  const inferredMax = Math.max(0, ...values);
  const yMin = Number.isFinite(object.y_min) ? Number(object.y_min) : inferredMin;
  let yMax = Number.isFinite(object.y_max) ? Number(object.y_max) : inferredMax;
  if (yMax <= yMin) yMax = yMin + 1;
  const yStep = object.y_step && object.y_step > 0 ? object.y_step : niceStep(yMax - yMin);
  const childState = childRuntimeState(runtimeState);

  const left = object.x + 54;
  const top = object.y + 14;
  const right = object.x + object.width - 18;
  const bottom = object.y + object.height - 50;
  const plotWidth = Math.max(40, right - left);
  const plotHeight = Math.max(40, bottom - top);
  const span = yMax - yMin;
  const yFor = (value: number) => bottom - ((value - yMin) / span) * plotHeight;
  const zeroY = yFor(Math.min(yMax, Math.max(yMin, 0)));

  const yAxis: MathAxisObject = {
    id: childObjectId(object.id, "y_axis"),
    type: "axis",
    orientation: "vertical",
    from: { x: left, y: bottom },
    to: { x: left, y: top },
    min: yMin,
    max: yMax,
    step: yStep,
    label: object.y_label,
    show_tick_labels: true,
    style: object.style,
  };

  const xAxis: MathLineObject = {
    id: childObjectId(object.id, "x_axis"),
    type: "line",
    from: { x: left, y: zeroY },
    to: { x: right, y: zeroY },
    style: object.style,
  };

  const gap = plotWidth / object.data.length;
  const barWidth = Math.max(12, Math.min(80, gap * 0.62));

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={{ x: object.x + object.width / 2, y: object.y + 2 }}
    >
      <AxisPrimitive
        object={yAxis}
        visualId={visualId}
        points={points}
        objectsById={objectsById}
        runtimeState={childState}
      />
      <LinePrimitive
        object={xAxis}
        visualId={visualId}
        points={points}
        objectsById={objectsById}
        runtimeState={childState}
      />

      {object.data.map((datum, index) => {
        const centerX = left + gap * index + gap / 2;
        const valueY = yFor(datum.value);
        const rectY = Math.min(valueY, zeroY);
        const rectHeight = Math.max(1, Math.abs(zeroY - valueY));
        const bar: MathRectangleObject = {
          id: childObjectId(object.id, `bar_${datum.id}`),
          type: "rectangle",
          x: centerX - barWidth / 2,
          y: rectY,
          width: barWidth,
          height: rectHeight,
          style: mergeStyle(object.style, {
            tone: datum.tone || DATA_TONES[index % DATA_TONES.length],
            fill: "solid",
          }),
        };
        const category: MathTextObject = {
          id: childObjectId(object.id, `category_${datum.id}`),
          type: "text",
          x: centerX,
          y: bottom + 27,
          text: datum.label,
          anchor: "middle",
          role: "label",
          style: object.style,
        };
        const value: MathTextObject = {
          id: childObjectId(object.id, `value_${datum.id}`),
          type: "text",
          x: centerX,
          y: datum.value >= 0 ? valueY - 9 : valueY + 21,
          text: formatNumber(datum.value),
          anchor: "middle",
          role: "value",
          style: object.style,
        };

        return (
          <g key={datum.id}>
            <RectanglePrimitive
              object={bar}
              visualId={visualId}
              points={points}
              objectsById={objectsById}
              runtimeState={childState}
            />
            <TextPrimitive
              object={category}
              visualId={visualId}
              points={points}
              objectsById={objectsById}
              runtimeState={childState}
            />
            {object.show_values && (
              <TextPrimitive
                object={value}
                visualId={visualId}
                points={points}
                objectsById={objectsById}
                runtimeState={childState}
              />
            )}
          </g>
        );
      })}

      {object.x_label && (
        <TextPrimitive
          object={{
            id: childObjectId(object.id, "x_label"),
            type: "text",
            x: (left + right) / 2,
            y: object.y + object.height - 5,
            text: object.x_label,
            anchor: "middle",
            role: "label",
            style: object.style,
          }}
          visualId={visualId}
          points={points}
          objectsById={objectsById}
          runtimeState={childState}
        />
      )}
    </SemanticObjectGroup>
  );
}

function renderLineGraph({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<MathLineGraphObject>) {
  if (object.points.length < 2) return null;
  const xs = object.points.map((point) => point.x);
  const ys = object.points.map((point) => point.y);
  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  if (xMax <= xMin) { xMin -= 1; xMax += 1; }
  if (yMax <= yMin) { yMin -= 1; yMax += 1; }

  const left = object.x + 58;
  const top = object.y + 18;
  const right = object.x + object.width - 24;
  const bottom = object.y + object.height - 48;
  const plotWidth = Math.max(40, right - left);
  const plotHeight = Math.max(40, bottom - top);
  const xFor = (value: number) => left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  const yFor = (value: number) => bottom - ((value - yMin) / (yMax - yMin)) * plotHeight;
  const childState = childRuntimeState(runtimeState);

  const xAxis: MathAxisObject = {
    id: childObjectId(object.id, "x_axis"),
    type: "axis",
    orientation: "horizontal",
    from: { x: left, y: bottom },
    to: { x: right, y: bottom },
    min: xMin,
    max: xMax,
    step: niceStep(xMax - xMin),
    label: object.x_label,
    show_tick_labels: true,
    style: object.style,
  };
  const yAxis: MathAxisObject = {
    id: childObjectId(object.id, "y_axis"),
    type: "axis",
    orientation: "vertical",
    from: { x: left, y: bottom },
    to: { x: left, y: top },
    min: yMin,
    max: yMax,
    step: niceStep(yMax - yMin),
    label: object.y_label,
    show_tick_labels: true,
    style: object.style,
  };

  const projected = object.points.map((point) => ({
    source: point,
    x: xFor(point.x),
    y: yFor(point.y),
  }));

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={{ x: object.x + object.width / 2, y: object.y + 2 }}
    >
      <AxisPrimitive object={xAxis} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />
      <AxisPrimitive object={yAxis} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />

      {object.connect_points !== false && projected.slice(1).map((point, index) => {
        const previous = projected[index];
        const line: MathLineObject = {
          id: childObjectId(object.id, `segment_${index}`),
          type: "line",
          from: { x: previous.x, y: previous.y },
          to: { x: point.x, y: point.y },
          style: mergeStyle(object.style, { tone: "accent" }),
        };
        return <LinePrimitive key={line.id} object={line} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />;
      })}

      {projected.map(({ source, x, y }) => {
        const marker: MathPointObject = {
          id: childObjectId(object.id, `point_${source.id}`),
          type: "point",
          x,
          y,
          show_marker: true,
          style: mergeStyle(object.style, { tone: "accent" }),
        };
        const label: MathTextObject | null = source.label
          ? {
              id: childObjectId(object.id, `label_${source.id}`),
              type: "text",
              x,
              y: bottom + 27,
              text: source.label,
              anchor: "middle",
              role: "label",
              style: object.style,
            }
          : null;
        return (
          <g key={source.id}>
            <PointPrimitive object={marker} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />
            {label && <TextPrimitive object={label} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />}
          </g>
        );
      })}
    </SemanticObjectGroup>
  );
}

function renderPieChart({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<MathPieChartObject>) {
  const total = object.slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
  if (!(total > 0)) return null;
  const childState = childRuntimeState(runtimeState, { shaded: undefined });
  let angle = -90;

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={{ x: object.cx, y: object.cy - object.radius - 8 }}
    >
      {object.slices.map((slice, index) => {
        const sweep = (Math.max(0, slice.value) / total) * 360;
        const start = angle;
        const end = angle + sweep;
        angle = end;
        const steps = Math.max(3, Math.min(72, Math.ceil(sweep / 8)));
        const arcPoints = Array.from({ length: steps + 1 }, (_, stepIndex) => {
          const theta = start + (sweep * stepIndex) / steps;
          const radians = (theta * Math.PI) / 180;
          return {
            x: object.cx + Math.cos(radians) * object.radius,
            y: object.cy + Math.sin(radians) * object.radius,
          };
        });
        const slicePolygon: MathPolygonObject = {
          id: childObjectId(object.id, `slice_${slice.id}`),
          type: "polygon",
          points: [{ x: object.cx, y: object.cy }, ...arcPoints],
          closed: true,
          style: mergeStyle(object.style, {
            tone: DATA_TONES[index % DATA_TONES.length],
            fill: runtimeState?.shaded === false ? "none" : "solid",
          }),
        };
        const mid = start + sweep / 2;
        const midRad = (mid * Math.PI) / 180;
        const labelX = object.cx + Math.cos(midRad) * object.radius * 0.62;
        const labelY = object.cy + Math.sin(midRad) * object.radius * 0.62;
        const labelParts = [
          object.show_labels !== false ? slice.label : "",
          object.show_values ? formatNumber(slice.value) : "",
        ].filter(Boolean);
        const label: MathTextObject = {
          id: childObjectId(object.id, `label_${slice.id}`),
          type: "text",
          x: labelX,
          y: labelY + 5,
          text: labelParts.join(" "),
          anchor: "middle",
          role: "label",
          style: mergeStyle(object.style, { tone: "default" }),
        };

        return (
          <g key={slice.id}>
            <PolygonPrimitive object={slicePolygon} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />
            {labelParts.length > 0 && <TextPrimitive object={label} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childRuntimeState(runtimeState)} />}
          </g>
        );
      })}
    </SemanticObjectGroup>
  );
}

function niceStep(span: number) {
  const safeSpan = Math.max(Math.abs(span), 1e-9);
  const rough = safeSpan / 5;
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const scaled = rough / power;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return nice * power;
}

function formatNumber(value: number) {
  return Number(value.toFixed(6)).toString();
}
