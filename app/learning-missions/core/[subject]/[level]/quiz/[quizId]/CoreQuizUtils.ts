import type {
  JsonObject,
  QuestionType,
  QuizOption,
  QuizQuestion,
} from "./CoreQuizTypes";

export function asOptions(content: JsonObject): QuizOption[] {
  const options = Array.isArray(content.options) ? content.options : [];

  return options
    .map((option: any, index: number) => ({
      id: String(option?.id ?? option?.key ?? index + 1),
      text: String(option?.text ?? ""),
      image_url: option?.image_url ? String(option.image_url) : null,
      image_alt: option?.image_alt ? String(option.image_alt) : null,
      show_text_with_image: option?.show_text_with_image === true,
    }))
    .filter(
      (option: QuizOption) =>
        option.text.trim().length > 0 || Boolean(option.image_url),
    );
}

export function getBlankIds(content: JsonObject) {
  const explicit = Array.isArray(content.blank_ids)
    ? content.blank_ids.map(String)
    : [];
  if (explicit.length > 0) return explicit;

  const text = String(content.text_with_blanks ?? content.text ?? "");
  const matches = Array.from(text.matchAll(/\{\{([^}]+)\}\}/g));
  return matches.map((match) => String(match[1]));
}

export function responseIsComplete(
  question: QuizQuestion,
  response?: JsonObject,
) {
  if (!response) return false;

  switch (question.question_type) {
    case "multiple_choice":
    case "true_false":
    case "listening_comprehension":
      return Boolean(response.option_id);
    case "multiple_select":
      return Array.isArray(response.option_ids) && response.option_ids.length > 0;
    case "short_text":
    case "open_cloze":
    case "editing":
    case "long_text":
    case "picture_description":
      return String(response.text ?? "").trim().length > 0;
    case "sentence_reordering":
      return (
        Array.isArray(response.token_ids) &&
        response.token_ids.length ===
          (Array.isArray(question.content.tokens)
            ? question.content.tokens.length
            : 0)
      );
    case "matching": {
      const left = Array.isArray(question.content.left)
        ? question.content.left
        : [];
      const matches = response.matches ?? {};
      return left.length > 0 && left.every((item: any) => matches[String(item.id)]);
    }
    case "word_bank":
    case "dropdown_cloze": {
      if (question.content.layout === "drag_drop_grouped") {
        const blankId = String(
          question.content.blank_id ?? question.question_order,
        );
        return Boolean(response.values?.[blankId]);
      }

      const blankIds = getBlankIds(question.content);
      const values = response.values ?? {};
      return blankIds.length > 0 && blankIds.every((id) => values[id]);
    }
    case "oral_recording":
      return Boolean(response.storage_path);
    default:
      return false;
  }
}

export function friendlyCorrectResponse(value: JsonObject | string | null) {
  if (value == null) return "";
  if (typeof value === "string") return value;

  if (typeof value.display === "string") return value.display;
  if (typeof value.display_answer === "string") return value.display_answer;
  if (typeof value.text === "string") return value.text;
  if (Array.isArray(value.correct_option_ids)) {
    return value.correct_option_ids.join(", ");
  }
  if (Array.isArray(value.accepted_answers)) {
    return value.accepted_answers.join(" / ");
  }
  if (Array.isArray(value.order)) return value.order.join(" → ");

  if (
    value.values &&
    typeof value.values === "object" &&
    !Array.isArray(value.values)
  ) {
    return Object.entries(value.values)
      .sort(([left], [right]) => {
        const leftNumber = Number(left);
        const rightNumber = Number(right);

        if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
          return leftNumber - rightNumber;
        }

        return left.localeCompare(right);
      })
      .map(([, answer]) => String(answer))
      .join(" / ");
  }

  return JSON.stringify(value);
}

export function isCoreTopicLockError(value: unknown) {
  const message = String(value ?? "").trim().toLowerCase();

  return (
    message.includes("topic is currently locked") ||
    message.includes("admin access only")
  );
}

export function normaliseCurriculumRole(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
}

export function formatCoreQuestionType(type: QuestionType) {
  const labels: Record<QuestionType, string> = {
    multiple_choice: "Multiple Choice",
    multiple_select: "Multiple Select",
    true_false: "True or False",
    short_text: "Short Answer",
    long_text: "Extended Response",
    sentence_reordering: "Put in Order",
    matching: "Matching",
    word_bank: "Word Bank",
    dropdown_cloze: "Dropdown Cloze",
    open_cloze: "Open Cloze",
    editing: "Editing",
    picture_description: "Picture Description",
    listening_comprehension: "Listening Comprehension",
    oral_recording: "Oral Response",
  };

  return labels[type];
}

export function getQuestionVisualMediaCount(question: QuizQuestion) {
  const stimulusType = question.stimulus?.stimulus_type;
  const stimulusIsVisual =
    stimulusType === "image" ||
    stimulusType === "diagram" ||
    stimulusType === "graph";

  const attachmentCount = (question.assets || []).filter(
    (asset) => asset.asset_type === "image" || asset.asset_type === "svg",
  ).length;

  return (stimulusIsVisual ? 1 : 0) + attachmentCount;
}
