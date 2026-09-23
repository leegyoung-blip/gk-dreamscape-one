import type { CurriculumConcept } from "@/lib/nova-plus/types";
import type { NovaSchoolworkSkillEvidence } from "@/hooks/useNovaSchoolworkEvidence";
import type { NovaTeachingSignal } from "@/lib/nova-plus/teaching-evidence";
import MasteryTeachingSignal from "./MasteryTeachingSignal";
import styles from "./MasteryConceptDetail.module.css";

export type MasteryDetailState =
  | "strong"
  | "developing"
  | "attention"
  | "unknown";

export type MasteryDetailStateMeta = {
  label: string;
  colour: string;
  soft: string;
  border: string;
};

function formatDate(value: string | null) {
  if (!value) return "Not practised yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not practised yet";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function parentFriendlyExplanation(concept: CurriculumConcept) {
  const supplied = String(concept.public_explanation || "").trim();
  if (supplied) return supplied;

  const name = String(concept.skill_name || "this concept").trim();
  const verbLed = /^(identify|recognise|recognize|use|retrieve|answer|compare|order|represent|solve|add|subtract|multiply|divide|read|write|interpret|explain|apply|find|measure|estimate|classify|describe|infer|sequence|distinguish|calculate|convert|complete|choose|determine|construct|name|match|count|arrange|reason|understand|connect|express|simplify|partition|continue|compose)\b/i.test(
    name,
  );

  if (verbLed) {
    return `This checks whether the learner can ${name.charAt(0).toLowerCase()}${name.slice(1)} accurately and independently.`;
  }

  return `This checks the learner's understanding and application of ${name.toLowerCase()}.`;
}

export default function MasteryConceptDetail({
  concept,
  state,
  stateMeta,
  subjectLabel,
  schoolwork,
  teachingSignals,
  onOpenRecommendations,
  onClose,
}: {
  concept: CurriculumConcept;
  state: MasteryDetailState;
  stateMeta: MasteryDetailStateMeta;
  subjectLabel: string;
  schoolwork?: NovaSchoolworkSkillEvidence;
  teachingSignals: NovaTeachingSignal[];
  onOpenRecommendations: () => void;
  onClose: () => void;
}) {
  return (
    <section
      className={styles.panel}
      style={{ borderColor: stateMeta.border }}
      aria-label={`${concept.skill_name} concept intelligence`}
    >
      <div className={styles.heading}>
        <div className={styles.titleBlock}>
          <span className={styles.status} style={{ color: stateMeta.colour }}>
            <i style={{ background: stateMeta.colour }} /> {stateMeta.label}
          </span>
          <h3>{concept.skill_name}</h3>
          <p>
            {subjectLabel} · Primary {concept.primary_level} · {concept.topic}
          </p>
        </div>

        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close concept intelligence"
        >
          ×
        </button>
      </div>

      <div className={styles.metrics}>
        <span>
          <small>Mastery</small>
          <strong>
            {concept.has_evidence && concept.mastery_score !== null
              ? `${Math.round(concept.mastery_score)}%`
              : "—"}
          </strong>
        </span>
        <span>
          <small>Confidence</small>
          <strong>
            {concept.has_evidence && concept.confidence_score !== null
              ? `${Math.round(concept.confidence_score)}%`
              : "—"}
          </strong>
        </span>
        <span>
          <small>Questions</small>
          <strong>{concept.questions_attempted}</strong>
        </span>
        <span>
          <small>Trend</small>
          <strong>{concept.trend === "no_data" ? "—" : concept.trend}</strong>
        </span>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.explanation}>
          <span>WHAT THIS MEANS</span>
          <p>{parentFriendlyExplanation(concept)}</p>
          <small>
            Status is based on the learner&apos;s recorded curriculum evidence. A
            teaching halo adds context but does not change this mastery state.
          </small>
        </div>

        {teachingSignals.length > 0 && (
          <MasteryTeachingSignal signals={teachingSignals} />
        )}

        {schoolwork && (
          <div className={styles.schoolwork}>
            <span>UPLOADED SCHOOLWORK</span>
            <strong>
              {schoolwork.event_count} approved question
              {schoolwork.event_count === 1 ? "" : "s"} from {schoolwork.upload_count}{" "}
              upload{schoolwork.upload_count === 1 ? "" : "s"}
            </strong>
            <small>
              Reviewed uploaded work is included as supporting evidence and
              carries a lower weight than native Dreamscape quiz evidence.
            </small>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <span>Last practised: {formatDate(concept.last_attempted_at)}</span>
        {state !== "unknown" && (
          <button type="button" onClick={onOpenRecommendations}>
            See Nova&apos;s recommendation →
          </button>
        )}
      </footer>
    </section>
  );
}
