import type { Phase4BSourceRecord } from "./types";

/**
 * Phase 4B source-governance anchors.
 *
 * Important: a source record grants only the claim tags explicitly listed in
 * `allowedClaimTags`. A method may not label a teaching technique as
 * `official_curriculum` merely because the technique is common in Singapore.
 */
export const PHASE4B_SOURCE_MANIFEST: readonly Phase4BSourceRecord[] = [
  {
    sourceId: "moe-primary-math-syllabus-2021-updated-oct-2025",
    title: "Primary Mathematics Syllabus, Primary One to Six",
    publisher: "Singapore Ministry of Education",
    sourceClass: "official_curriculum",
    url: "https://www.moe.gov.sg/-/media/files/primary/2021-primary-mathematics-syllabus-p1-to-p6-updated-october-2025.pdf",
    allowedClaimTags: [
      "curriculum_scope",
      "curriculum_learning_experience",
      "cpa_guidance",
      "learning_phases",
      "problem_solving_heuristics",
      "representation_selection",
      "conceptual_understanding",
    ],
    locators: [
      {
        label: "Phases of Learning",
        locator: "Primary Mathematics syllabus, around p.22: Readiness, Engagement and Mastery",
      },
      {
        label: "Mathematical Processes MP2/MP3",
        locator: "Primary Mathematics syllabus, around p.32: representations, thinking skills and heuristics",
      },
      {
        label: "Content & Learning Experiences",
        locator: "Primary Mathematics syllabus, around p.33: Concrete-Pictorial-Abstract learning experience",
      },
    ],
    supports: [
      "Primary mathematics curriculum scope and learning experiences",
      "Concrete-Pictorial-Abstract as a learning-experience consideration",
      "Readiness, Engagement and Mastery phases of learning",
      "Thinking skills and heuristics including drawing a diagram, tabulating, guess and check and working backwards",
      "Selecting appropriate mathematical representations, concepts, skills, tools and algorithms",
    ],
    cautions: [
      "Do not label a specific Dreamscape implementation as an official MOE method unless the source directly supports that exact claim.",
      "The syllabus supports curriculum and pedagogical principles; detailed method templates remain Dreamscape implementation unless separately sourced.",
    ],
  },
  {
    sourceId: "nie-singapore-primary-math-cpa",
    title: "CME0002 Singapore Primary Mathematics: Concrete-Pictorial-Abstract",
    publisher: "National Institute of Education, Nanyang Technological University",
    sourceClass: "common_singapore_pedagogy",
    url: "https://www.ntu.edu.sg/nie/admissions/continuing-education-training/cme0002-singapore-primary-mathematics",
    allowedClaimTags: [
      "cpa_guidance",
      "conceptual_understanding",
      "singapore_primary_pedagogy",
    ],
    locators: [
      {
        label: "Course introduction and outcomes",
        locator: "CME0002 course page: CPA instructional sequence and connection of concrete, pictorial and abstract representations",
      },
    ],
    supports: [
      "Concrete-Pictorial-Abstract instructional sequence in Singapore primary mathematics",
      "Connecting concrete materials, pictorial representations and abstract notation",
      "Using representations purposefully to support conceptual understanding, reasoning and communication",
    ],
    cautions: [
      "Use as a Singapore teacher-education reference, not as proof that every CPA implementation is mandated by MOE.",
    ],
  },
] as const;

export function getPhase4BSourceRecord(sourceId: string): Phase4BSourceRecord | null {
  return PHASE4B_SOURCE_MANIFEST.find((source) => source.sourceId === sourceId) ?? null;
}
