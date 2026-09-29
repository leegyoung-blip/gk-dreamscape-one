import type {
  MathTeachingTemplateContext,
  MathTeachingTemplatePlan,
} from "./teaching-templates/templateUtils";
import { barModelTeachingTemplate } from "./teaching-templates/barModel";
import { clockTeachingTemplate } from "./teaching-templates/clock";
import { dataTeachingTemplate } from "./teaching-templates/data";
import { fractionTeachingTemplate } from "./teaching-templates/fraction";
import { geometryTeachingTemplate } from "./teaching-templates/geometry";
import { measurementTeachingTemplate } from "./teaching-templates/measurement";
import { numberLineTeachingTemplate } from "./teaching-templates/numberLine";
import { placeValueTeachingTemplate } from "./teaching-templates/placeValue";
import { solidTeachingTemplate } from "./teaching-templates/solid";

export type {
  MathTeachingTemplateContext,
  MathTeachingTemplatePlan,
} from "./teaching-templates/templateUtils";

const TEMPLATE_RESOLVERS = [
  fractionTeachingTemplate,
  numberLineTeachingTemplate,
  geometryTeachingTemplate,
  solidTeachingTemplate,
  dataTeachingTemplate,
  clockTeachingTemplate,
  barModelTeachingTemplate,
  placeValueTeachingTemplate,
  measurementTeachingTemplate,
] as const;

/**
 * Phase 2F-B deterministic template library.
 *
 * Every resolver is pure Dreamscape code. It may only reference object IDs
 * already present in the V2 spec/role map; it never creates or changes maths.
 */
export function getMathTeachingTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  for (const resolver of TEMPLATE_RESOLVERS) {
    const plan = resolver(context);
    if (plan) return plan;
  }
  return null;
}
