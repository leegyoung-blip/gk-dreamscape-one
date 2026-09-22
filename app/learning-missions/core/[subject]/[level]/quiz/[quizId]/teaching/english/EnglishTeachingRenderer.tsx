"use client";

import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import CoreTeachingLesson from "../CoreTeachingLesson";
import EditingLesson from "./EditingLesson";
import RuleClueLesson from "./RuleClueLesson";
import RuleMatrixLesson from "./RuleMatrixLesson";
import SentenceBreakdownLesson from "./SentenceBreakdownLesson";
import VocabularyLesson from "./VocabularyLesson";

export default function EnglishTeachingRenderer({
  question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const type = lesson.type.trim().toLocaleLowerCase().replace(/[-\s]+/g, "_");

  if (["rule_clue", "rule_and_clue", "grammar_rule"].includes(type)) {
    return <RuleClueLesson question={question} lesson={lesson} label={label} />;
  }

  if (["rule_matrix", "matrix", "comparison_matrix"].includes(type)) {
    return <RuleMatrixLesson question={question} lesson={lesson} label={label} />;
  }

  if (["sentence_breakdown", "sentence_clues", "sentence_analysis"].includes(type)) {
    return (
      <SentenceBreakdownLesson
        question={question}
        lesson={lesson}
        label={label}
      />
    );
  }

  if (["vocabulary", "vocabulary_context", "word_meaning"].includes(type)) {
    return <VocabularyLesson question={question} lesson={lesson} label={label} />;
  }

  if (["editing", "editing_correction", "correction"].includes(type)) {
    return <EditingLesson question={question} lesson={lesson} label={label} />;
  }

  return <CoreTeachingLesson lesson={lesson} label={label} />;
}
