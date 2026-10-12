/**
 * Compatibility shim.
 *
 * Phase 4A-3 QA belongs under teaching/contract/qa.
 * Some earlier installs may have left a duplicate at teaching/qa.
 * Keep this file as a harmless forwarding module so existing imports/builds
 * cannot fail, while the canonical implementation remains in contract/qa.
 */
export * from "../contract/qa/runPhase4A3QaFromExport";
