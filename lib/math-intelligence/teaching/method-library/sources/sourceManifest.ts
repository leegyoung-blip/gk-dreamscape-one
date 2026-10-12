import type { MethodProvenanceClass } from "../taxonomy/types";

export type Phase4BSourceRecord = {
  sourceId: string;
  title: string;
  publisher: string;
  sourceClass: MethodProvenanceClass;
  url: string;
  supports: string[];
  cautions: string[];
};

/**
 * Phase 4B source-governance anchors.
 *
 * These records do not claim that every Dreamscape method family is an MOE
 * prescribed method. They provide the provenance vocabulary required by the
 * locked 4B decisions. Method-level citations are added in 4B-2 onward.
 */
export const PHASE4B_SOURCE_MANIFEST: readonly Phase4BSourceRecord[] = [
  {
    sourceId: "moe-primary-math-syllabus-2021-updated-oct-2025",
    title: "Primary Mathematics Syllabus, Primary One to Six",
    publisher: "Singapore Ministry of Education",
    sourceClass: "official_curriculum",
    url: "https://www.moe.gov.sg/-/media/files/primary/2021-primary-mathematics-syllabus-p1-to-p6-updated-october-2025.pdf",
    supports: [
      "Primary mathematics curriculum scope and learning experiences",
      "Concrete-Pictorial-Abstract as a learning-experience consideration",
      "Readiness, Engagement and Mastery phases of learning",
      "Activity-based Learning, Inquiry-based Learning and Direct Instruction",
      "Thinking skills and heuristics such as drawing a diagram, tabulating, guess and check and working backwards",
      "Selecting appropriate mathematical representations, concepts, skills, tools and algorithms",
    ],
    cautions: [
      "Do not label a specific Dreamscape implementation as an official MOE method unless the source directly supports that claim.",
      "The syllabus supports curriculum and pedagogical principles; detailed method templates remain Dreamscape implementation unless separately sourced.",
    ],
  },
  {
    sourceId: "nie-singapore-primary-math-cpa",
    title: "Singapore Primary Mathematics: Concrete-Pictorial-Abstract",
    publisher: "National Institute of Education, Nanyang Technological University",
    sourceClass: "common_singapore_pedagogy",
    url: "https://www.ntu.edu.sg/nie/admissions/continuing-education-training/cme0002-singapore-primary-mathematics",
    supports: [
      "Concrete-Pictorial-Abstract instructional sequence",
      "Connecting concrete materials, pictorial representations and abstract notation",
    ],
    cautions: [
      "Use as a Singapore teacher-education reference, not as proof that every CPA implementation is mandated by MOE.",
    ],
  },
] as const;
