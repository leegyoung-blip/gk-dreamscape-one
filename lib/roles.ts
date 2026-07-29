export type DreamscapeRole =
  | "admin"
  | "regular"
  | "student"
  | "teacher"
  | "curriculum_lead";

export function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

export function isAdminRole(value: string | null | undefined) {
  return normaliseRole(value) === "admin";
}

export function isTeacherRole(value: string | null | undefined) {
  return normaliseRole(value) === "teacher";
}

export function isCurriculumLeadRole(value: string | null | undefined) {
  return normaliseRole(value) === "curriculum-lead";
}

export function hasTeachingAccess(value: string | null | undefined) {
  const role = normaliseRole(value);
  return role === "admin" || role === "teacher" || role === "curriculum-lead";
}

export function hasFullLearningAccess(value: string | null | undefined) {
  const role = normaliseRole(value);
  return (
    role === "admin" ||
    role === "student" ||
    role === "teacher" ||
    role === "curriculum-lead"
  );
}

export function canManageScienceCurriculum(value: string | null | undefined) {
  const role = normaliseRole(value);
  return role === "admin" || role === "curriculum-lead";
}

export function roleDisplayName(value: string | null | undefined) {
  switch (normaliseRole(value)) {
    case "admin":
      return "Admin";
    case "student":
      return "Student";
    case "teacher":
      return "Teacher";
    case "curriculum-lead":
      return "Curriculum Lead";
    default:
      return "Regular";
  }
}
