"use client";

import { useMemo } from "react";

export type CreatorEngineOption = {
  option_key: string;
  label: string;
  image_url: string | null;
  sort_order: number;
};

export type CreatorEngineQuestion = {
  id: string;
  quiz_id?: string;
  question_order: number;
  question_type:
    | "classic_choice"
    | "choice_grid"
    | "bar_estimate"
    | "pie_estimate";
  prompt: string;
  config: Record<string, unknown>;
  explanation?: string | null;
  topic?: string | null;
  difficulty?: number;
  options: CreatorEngineOption[];
};

export type CreatorEngineAnswerValue = {
  selectedKeys: string[];
  numericValue: number | null;
};

export default function CreatorQuestionRenderer({
  question,
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  question: CreatorEngineQuestion;
  value: CreatorEngineAnswerValue;
  onChange: (next: CreatorEngineAnswerValue) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const selectionMode = String(
    question.config?.selection_mode || "single",
  ).toLowerCase();

  const min = Number(question.config?.min ?? 0);
  const max = Number(question.config?.max ?? 100);
  const step = Math.max(0.01, Number(question.config?.step ?? 1));
  const unit = String(question.config?.unit || "");
  const currentNumeric =
    value.numericValue === null || !Number.isFinite(value.numericValue)
      ? min
      : Math.max(min, Math.min(max, Number(value.numericValue)));

  const piePercent =
    question.question_type === "pie_estimate"
      ? Math.max(0, Math.min(100, value.numericValue ?? 50))
      : 0;

  const gridColumns = useMemo(() => {
    const count = question.options.length;
    if (count <= 4) return "repeat(2, minmax(0, 1fr))";
    if (count <= 9) return "repeat(3, minmax(0, 1fr))";
    if (count <= 16) return "repeat(4, minmax(0, 1fr))";
    return "repeat(5, minmax(0, 1fr))";
  }, [question.options.length]);

  function choose(key: string) {
    if (disabled) return;

    if (selectionMode === "multi") {
      const selected = value.selectedKeys.includes(key)
        ? value.selectedKeys.filter((item) => item !== key)
        : [...value.selectedKeys, key];

      onChange({ ...value, selectedKeys: selected });
      return;
    }

    onChange({ ...value, selectedKeys: [key] });
  }

  return (
    <section
      className={`rounded-[24px] border border-white/10 bg-[#061327]/90 ${
        compact ? "p-4" : "p-5 sm:p-6"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyan-200/14 bg-cyan-300/[0.055] px-3 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-cyan-100/72">
          {questionTypeLabel(question.question_type)}
        </span>

        {question.topic && (
          <span className="rounded-full border border-white/9 bg-white/[0.03] px-3 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-white/34">
            {question.topic}
          </span>
        )}

        {question.question_type === "choice_grid" &&
          selectionMode === "multi" && (
            <span className="rounded-full border border-violet-200/14 bg-violet-300/[0.055] px-3 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-violet-100/72">
              Select all that apply
            </span>
          )}
      </div>

      <h3
        className={`mt-4 font-black leading-tight text-white ${
          compact ? "text-lg" : "text-2xl sm:text-3xl"
        }`}
      >
        {question.prompt || "Your question preview appears here."}
      </h3>

      {question.question_type === "classic_choice" && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {question.options.map((option) => (
            <ChoiceTile
              key={option.option_key}
              option={option}
              selected={value.selectedKeys.includes(option.option_key)}
              onClick={() => choose(option.option_key)}
              disabled={disabled}
              compact={compact}
            />
          ))}
        </div>
      )}

      {question.question_type === "choice_grid" && (
        <div
          className="mt-5 grid gap-2 sm:gap-3"
          style={{ gridTemplateColumns: gridColumns }}
        >
          {question.options.map((option) => (
            <ChoiceTile
              key={option.option_key}
              option={option}
              selected={value.selectedKeys.includes(option.option_key)}
              onClick={() => choose(option.option_key)}
              disabled={disabled}
              compact
            />
          ))}
        </div>
      )}

      {question.question_type === "bar_estimate" && (
        <div className="mt-6 rounded-[22px] border border-amber-200/12 bg-amber-300/[0.035] p-5">
          <div className="flex items-end justify-between gap-4">
            <span>
              <span className="block text-[8px] font-black uppercase tracking-[0.1em] text-white/28">
                Your estimate
              </span>
              <strong className="mt-1 block text-3xl text-amber-100">
                {formatValue(currentNumeric)}
                {unit ? ` ${unit}` : ""}
              </strong>
            </span>

            <span className="text-[9px] text-white/28">
              {formatValue(min)}
              {unit ? ` ${unit}` : ""} – {formatValue(max)}
              {unit ? ` ${unit}` : ""}
            </span>
          </div>

          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={currentNumeric}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                selectedKeys: [],
                numericValue: Number(event.target.value),
              })
            }
            className="mt-6 w-full accent-amber-300"
          />

          <div className="mt-2 flex justify-between text-[8px] text-white/25">
            <span>
              {formatValue(min)}
              {unit ? ` ${unit}` : ""}
            </span>
            <span>
              {formatValue(max)}
              {unit ? ` ${unit}` : ""}
            </span>
          </div>
        </div>
      )}

      {question.question_type === "pie_estimate" && (
        <div className="mt-6 grid gap-5 rounded-[22px] border border-fuchsia-200/12 bg-fuchsia-300/[0.035] p-5 md:grid-cols-[190px_minmax(0,1fr)] md:items-center">
          <div
            aria-label={`${Math.round(piePercent)} percent`}
            className="mx-auto aspect-square w-[170px] rounded-full border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
            style={{
              background: `conic-gradient(rgba(244,114,182,0.88) 0 ${piePercent}%, rgba(255,255,255,0.07) ${piePercent}% 100%)`,
            }}
          >
            <div className="m-[32%] flex aspect-square items-center justify-center rounded-full border border-white/9 bg-[#061327]">
              <strong className="text-xl text-fuchsia-100">
                {Math.round(piePercent)}%
              </strong>
            </div>
          </div>

          <div>
            <span className="text-[8px] font-black uppercase tracking-[0.1em] text-fuchsia-100/56">
              Estimate the highlighted share
            </span>

            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={piePercent}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  selectedKeys: [],
                  numericValue: Number(event.target.value),
                })
              }
              className="mt-5 w-full accent-fuchsia-300"
            />

            <div className="mt-2 flex justify-between text-[8px] text-white/25">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ChoiceTile({
  option,
  selected,
  onClick,
  disabled,
  compact,
}: {
  option: CreatorEngineOption;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
  compact: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative min-h-[82px] overflow-hidden rounded-[18px] border text-left transition ${
        compact ? "p-3" : "p-4"
      } ${
        selected
          ? "border-cyan-200/34 bg-cyan-300/[0.10] shadow-[0_0_0_1px_rgba(126,232,255,0.08)]"
          : "border-white/9 bg-white/[0.03] hover:border-white/18"
      } disabled:cursor-default`}
    >
      {option.image_url && (
        <img
          src={option.image_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-22"
        />
      )}

      <div className="relative z-10 flex h-full items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[9px] font-black ${
            selected
              ? "border-cyan-200/30 bg-cyan-300/[0.10] text-cyan-100"
              : "border-white/10 bg-black/16 text-white/32"
          }`}
        >
          {option.option_key}
        </span>

        <strong
          className={`line-clamp-4 leading-5 ${
            compact ? "text-[10px]" : "text-xs"
          }`}
        >
          {option.label || (option.image_url ? "Image option" : "Option")}
        </strong>
      </div>
    </button>
  );
}

export function questionTypeLabel(
  type: CreatorEngineQuestion["question_type"],
) {
  switch (type) {
    case "classic_choice":
      return "Classic Choice";
    case "choice_grid":
      return "Choice Grid";
    case "bar_estimate":
      return "Bar Estimate";
    case "pie_estimate":
      return "Pie Estimate";
    default:
      return "Creator Question";
  }
}

function formatValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
