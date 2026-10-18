import type { MathematicalDomain } from "../types";
import type { StructureAnalysis } from "./structureRules";

/**
 * Phase 4E-2B-8A: narrowly evidenced examples from the staff QA cohort.
 * These detectors depend on explicit mathematical relationships in the PROMPT,
 * never answer keys, option text, staff tags or question IDs.
 * Returning null lets established rules handle all other questions.
 */
export function identifyRepresentativeWordProblemEvidence(
  text: string,
  domain: MathematicalDomain,
): StructureAnalysis | null {
  const t = text.replace(/\s+/g, " ").trim().toLowerCase();

  if (
    domain === "geometry" &&
    /\bwhich (?:2d )?shape has 4 equal straight sides and 4 corners\b/.test(t)
  ) {
    return {
      problemStructure: "property_matching",
      requiredReasoning: ["property_matching", "classification", "spatial_reasoning"],
      relationships: [],
      computedAnswer: null,
      confidence: 0.96,
      reasonCode: "STRUCTURE_EXPLICIT_EQUAL_SIDE_CORNER_PROPERTIES",
    };
  }

  if (domain === "measurement") {
    const spacing = t.match(
      /\btrees? are planted (\d{1,6})\s*(mm|cm|m|km) apart along a straight road\b/,
    );
    const between = t.match(
      /\bwhat is the distance between the (\d{1,5})(?:st|nd|rd|th) tree and the (\d{1,5})(?:st|nd|rd|th) tree\b/,
    );
    if (spacing && between) {
      const gapSize = Number(spacing[1]);
      const firstTree = Number(between[1]);
      const lastTree = Number(between[2]);
      const numberOfGaps = Math.abs(lastTree - firstTree);
      const distance = numberOfGaps * gapSize;
      if (
        Number.isSafeInteger(distance) &&
        gapSize > 0 && firstTree > 0 && lastTree > 0 &&
        lastTree !== firstTree && numberOfGaps <= 100000
      ) {
        return {
          problemStructure: "multi_step",
          requiredReasoning: ["subtraction", "multiplication"],
          relationships: [],
          computedAnswer: `${distance} ${spacing[2]}`,
          confidence: 0.97,
          reasonCode: "STRUCTURE_EQUAL_TREE_SPACING_INTERVAL_COUNT",
        };
      }
    }
  }

  // Two measured states of the SAME box plus equal-mass iron balls.
  // Unlike the generic "removed" rule, the given masses must not be
  // discarded merely because the unit suffix is attached (e.g. 2145g).
  // The rule is supported by all four quantities, never by a stored answer.
  if (domain === "whole_numbers" || domain === "arithmetic" || domain === "measurement") {
    const boxMassStory = t.match(
      /\b(?:a |the )?box containing (\d{1,6}) iron balls weighed (\d{1,9})\s*(g)\. when (\d{1,6}) of the iron balls were removed, the mass of the box and the remaining iron balls weighed (\d{1,9})\s*(g)\. what was the mass of the box\??$/,
    );
    if (boxMassStory && boxMassStory[3] === boxMassStory[6]) {
      const totalBalls = Number(boxMassStory[1]);
      const initialMass = Number(boxMassStory[2]);
      const removedBalls = Number(boxMassStory[4]);
      const remainingMass = Number(boxMassStory[5]);
      const remainingBalls = totalBalls - removedBalls;
      const massPerBall = (initialMass - remainingMass) / removedBalls;
      const boxMass = remainingMass - remainingBalls * massPerBall;
      if (
        [totalBalls, initialMass, removedBalls, remainingMass, remainingBalls, massPerBall, boxMass]
          .every(Number.isSafeInteger) &&
        removedBalls > 0 && remainingBalls > 0 &&
        initialMass > remainingMass && massPerBall > 0 && boxMass >= 0 &&
        initialMass === boxMass + totalBalls * massPerBall &&
        remainingMass === boxMass + remainingBalls * massPerBall
      ) {
        return {
          problemStructure: "multi_step",
          requiredReasoning: ["subtraction", "division", "multiplication", "working_backwards"],
          relationships: [],
          computedAnswer: `${boxMass} g`,
          confidence: 0.97,
          reasonCode: "STRUCTURE_TWO_MASS_STATES_EQUAL_BALLS",
        };
      }
    }
  }

  if (domain === "whole_numbers" || domain === "arithmetic" || domain === "money") {
    const marbleStory = t.match(
      /\b([a-z]+) has some marbles\. ([a-z]+) has thrice as many as \1\. ([a-z]+) has half as many as \2\. together they have (\d{1,7}) marbles\. how many marbles does \3 have\??/,
    );
    if (marbleStory) {
      const total = Number(marbleStory[4]);
      // Let the first quantity be 2 parts; the others are 6 and 3 parts.
      // Exactly 11 equal parts are needed; non-integral counts are refused.
      if (
        new Set(marbleStory.slice(1, 4)).size === 3 &&
        Number.isSafeInteger(total) && total > 0 && total % 11 === 0
      ) {
        const thirdPerson = (total / 11) * 3;
        return {
          problemStructure: "multi_step",
          requiredReasoning: ["comparison", "multiplication", "addition", "division"],
          relationships: [],
          computedAnswer: String(thirdPerson),
          confidence: 0.96,
          reasonCode: "STRUCTURE_THREE_PERSON_MULTIPLICATIVE_PARTS",
        };
      }
    }

    const tableStory = t.match(
      /\bbought (\d{1,6}) tables and chairs for \$([\d,]+)(?:\.\d+)?\. after (\d{1,6}) chairs were given away, the remaining numbers of tables and chairs were equal\. each table cost \$(\d{1,5}) more than each chair\./,
    );
    if (
      tableStory &&
      /\(a\) how many chairs did \w+ buy\? \(b\) what was the cost of each chair\?/.test(t)
    ) {
      const totalItems = Number(tableStory[1]);
      const totalCost = Number(tableStory[2].replace(/,/g, ""));
      const givenAway = Number(tableStory[3]);
      const differencePerTable = Number(tableStory[4]);
      const tables = (totalItems - givenAway) / 2;
      const chairs = totalItems - tables;
      const costPerChair = (totalCost - tables * differencePerTable) / totalItems;
      if (
        [totalItems, totalCost, givenAway, differencePerTable, tables, chairs, costPerChair]
          .every((value) => Number.isSafeInteger(value) && value > 0) &&
        givenAway < totalItems &&
        chairs - givenAway === tables &&
        tables * (costPerChair + differencePerTable) + chairs * costPerChair === totalCost
      ) {
        // Multipart choice: never compare a scalar to "chairs; $/chair".
        return {
          problemStructure: "multi_step",
          requiredReasoning: ["subtraction", "equation_solving", "multiplication", "addition"],
          relationships: [],
          computedAnswer: null,
          confidence: 0.96,
          reasonCode: "STRUCTURE_TWO_QUANTITY_COST_SYSTEM",
        };
      }
    }
  }

  return null;
}
