"use client";

import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import CoreTeachingLesson from "../CoreTeachingLesson";
import FractionLesson from "./FractionLesson";
import GeometryLesson from "./GeometryLesson";
import PlaceValueLesson from "./PlaceValueLesson";
import UnitConversionLesson from "./UnitConversionLesson";
import VerticalWorkingLesson from "./VerticalWorkingLesson";
import WordProblemLesson from "./WordProblemLesson";
import WorkedStepsLesson from "./WorkedStepsLesson";

export default function MathTeachingRenderer({
  question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const type = lesson.type.trim().toLocaleLowerCase().replace(/[-\s]+/g, "_");

  if (["worked_steps", "method_steps", "worked_example", "steps"].includes(type)) {
    return <WorkedStepsLesson question={question} lesson={lesson} label={label} />;
  }

  if ([
    "vertical_working",
    "column_working",
    "column_addition",
    "column_subtraction",
    "long_multiplication",
  ].includes(type)) {
    return <VerticalWorkingLesson question={question} lesson={lesson} label={label} />;
  }

  if (["place_value", "place_value_table", "regrouping_place_value"].includes(type)) {
    return <PlaceValueLesson question={question} lesson={lesson} label={label} />;
  }

  if (["fraction", "fraction_model", "fraction_steps", "fraction_working"].includes(type)) {
    return <FractionLesson question={question} lesson={lesson} label={label} />;
  }

  if (["geometry", "geometry_reasoning", "geometry_steps"].includes(type)) {
    return <GeometryLesson question={question} lesson={lesson} label={label} />;
  }

  if ([
    "unit_conversion",
    "measurement_conversion",
    "convert_units",
  ].includes(type)) {
    return <UnitConversionLesson question={question} lesson={lesson} label={label} />;
  }

  if (["word_problem", "problem_solving", "word_problem_steps"].includes(type)) {
    return <WordProblemLesson question={question} lesson={lesson} label={label} />;
  }

  return <CoreTeachingLesson lesson={lesson} label={label} />;
}
