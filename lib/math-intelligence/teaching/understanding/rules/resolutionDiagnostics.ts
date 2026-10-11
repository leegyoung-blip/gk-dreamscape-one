import type {
  CurriculumContext,
  MathematicalDomain,
  ProblemStructure,
  RequiredReasoning,
  ResolutionMetadata,
  ResolutionKind,
} from "../types";

export function classifyDomainResolution(args: {
  domain: MathematicalDomain;
  domainConfidence: number;
  curriculum: CurriculumContext;
  promptDomain: MathematicalDomain;
  promptConfidence: number;
}): ResolutionKind {
  if (args.domain === "unknown") {
    return "unresolved";
  }

  const curriculumSupports =
    args.curriculum.inferredDomain === args.domain &&
    args.curriculum.confidence >= 0.84 &&
    args.curriculum.selectedSource !== "unknown";

  const promptSupports =
    args.promptDomain === args.domain &&
    args.promptConfidence >= 0.8;

  if (curriculumSupports && promptSupports) {
    return "corroborated_inference";
  }

  if (curriculumSupports || promptSupports) {
    return "specific_rule";
  }

  return args.domainConfidence >= 0.75
    ? "corroborated_inference"
    : "generic_fallback";
}

export function classifyStructureResolution(args: {
  problemStructure: ProblemStructure;
  reasonCode: string;
}): ResolutionKind {
  if (args.problemStructure === "unknown") {
    return "unresolved";
  }

  if (args.reasonCode.includes("GENERIC")) {
    return "generic_fallback";
  }

  return "specific_rule";
}

export function classifyReasoningResolution(args: {
  requiredReasoning: RequiredReasoning[];
  structureResolution: ResolutionKind;
}): ResolutionKind {
  const unresolved =
    args.requiredReasoning.length === 0 ||
    args.requiredReasoning.every(
      (item) => item === "unknown",
    );

  if (unresolved) {
    return "unresolved";
  }

  if (args.structureResolution === "generic_fallback") {
    return "generic_fallback";
  }

  if (args.structureResolution === "corroborated_inference") {
    return "corroborated_inference";
  }

  return "specific_rule";
}

export function buildResolutionMetadata(args: {
  domain: MathematicalDomain;
  domainConfidence: number;
  curriculum: CurriculumContext;
  promptDomain: MathematicalDomain;
  promptConfidence: number;
  problemStructure: ProblemStructure;
  structureReasonCode: string;
  requiredReasoning: RequiredReasoning[];
}): ResolutionMetadata {
  const domain = classifyDomainResolution({
    domain: args.domain,
    domainConfidence: args.domainConfidence,
    curriculum: args.curriculum,
    promptDomain: args.promptDomain,
    promptConfidence: args.promptConfidence,
  });

  const structure = classifyStructureResolution({
    problemStructure: args.problemStructure,
    reasonCode: args.structureReasonCode,
  });

  const reasoning = classifyReasoningResolution({
    requiredReasoning: args.requiredReasoning,
    structureResolution: structure,
  });

  return {
    domain,
    structure,
    reasoning,
  };
}
