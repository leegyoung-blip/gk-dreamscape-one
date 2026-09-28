"use client";

import type { ReactNode } from "react";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import CoreTeachingLesson from "../CoreTeachingLesson";
import FractionLesson from "./FractionLesson";
import GeometryLesson from "./GeometryLesson";
import MathTeachingVisualSteps from "./MathTeachingVisualSteps";
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

  let lessonBody: ReactNode;

  if (["worked_steps", "method_steps", "worked_example", "steps"].includes(type)) {
    lessonBody = <WorkedStepsLesson question={question} lesson={lesson} label={label} />;
  } else if ([
    "vertical_working",
    "column_working",
    "column_addition",
    "column_subtraction",
    "long_multiplication",
  ].includes(type)) {
    lessonBody = <VerticalWorkingLesson question={question} lesson={lesson} label={label} />;
  } else if (["place_value", "place_value_table", "regrouping_place_value"].includes(type)) {
    lessonBody = <PlaceValueLesson question={question} lesson={lesson} label={label} />;
  } else if (["fraction", "fraction_model", "fraction_steps", "fraction_working"].includes(type)) {
    lessonBody = <FractionLesson question={question} lesson={lesson} label={label} />;
  } else if (["geometry", "geometry_reasoning", "geometry_steps"].includes(type)) {
    lessonBody = <GeometryLesson question={question} lesson={lesson} label={label} />;
  } else if ([
    "unit_conversion",
    "measurement_conversion",
    "convert_units",
  ].includes(type)) {
    lessonBody = <UnitConversionLesson question={question} lesson={lesson} label={label} />;
  } else if (["word_problem", "problem_solving", "word_problem_steps"].includes(type)) {
    lessonBody = <WordProblemLesson question={question} lesson={lesson} label={label} />;
  } else {
    lessonBody = <CoreTeachingLesson lesson={lesson} label={label} />;
  }

  return (
    <>
      <MathTeachingVisualSteps
        key={`${question.id}:${label}:${type}`}
        question={question}
        lesson={lesson}
      />
      {lessonBody}
    </>
  );
}
