import type { TeachingMethod } from "./types";
import { validateTeachingMethod } from "./validateTeachingMethod";

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return value;
}

/**
 * Production entry point for 4B-3 onward. Invalid methods fail at module-load
 * time instead of silently entering the library.
 */
export function defineTeachingMethod<const T extends TeachingMethod>(method: T): Readonly<T> {
  const validation = validateTeachingMethod(method);
  if (!validation.valid) {
    const summary = validation.blockers
      .map((item) => `${item.code}${item.path ? ` @ ${item.path}` : ""}: ${item.message}`)
      .join("\n");
    throw new Error(`Invalid TeachingMethod ${method.methodId}:\n${summary}`);
  }
  return deepFreeze(method);
}
