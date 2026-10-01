"use client";

import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BillingAdminShell from "../_components/BillingAdminShell";
import BillingModal from "../_components/BillingModal";

type Programme = {
  id: string;
  code: string;
  name: string;
  billing_frequency: string;
  default_fee: number | string;
};

type ClassSchedule = {
  id: string;
  class_name: string | null;
  academic_level: string; // legacy primary level kept by the database
  academic_levels: string[];
  subject: string;
  programme_id: string;
  programme_code: string;
  programme_name: string;
  regular_weekday: number;
  start_time: string;
  end_time: string;
  capacity: number;
  teacher_name: string | null;
  room: string | null;
  notes: string | null;
  status: "active" | "inactive";
  tracked_enrolled_count: number;
  manual_enrolled_count: number;
  enrolled_count: number;
  available_spaces: number;
  created_at: string;
  updated_at: string;
};

type RosterRow = {
  enrolment_id: string;
  student_id: string;
  student_name: string;
  academic_level: string | null;
  account_id: string;
  account_code: string;
  payer_name: string;
  programme_id: string;
  programme_name: string;
  enrolment_status: string;
};

type CandidateRow = {
  enrolment_id: string;
  student_id: string;
  student_name: string;
  academic_level: string | null;
  account_code: string;
  payer_name: string;
  class_schedule_id: string | null;
  assigned_class_label: string | null;
  assigned_weekday: number | null;
  assigned_start_time: string | null;
};

type ClassForm = {
  class_name: string;
  academic_levels: string[];
  subject_choice: string;
  other_subject: string;
  programme_id: string;
  regular_weekday: string;
  start_time: string;
  end_time: string;
  capacity: string;
  manual_enrolled_count: string;
  teacher_name: string;
  room: string;
  notes: string;
};

const DEFAULT_LEVELS = ["K2", "P1", "P2", "P3", "P4", "P5", "P6"];
const DEFAULT_SUBJECTS = ["English", "Math", "High Ability", "Science"];
const ALL_LEVELS = "__all_levels__";
const ALL_SUBJECTS = "__all_subjects__";
const WEEKDAYS: Array<[string, string]> = [
  ["1", "Monday"],
  ["2", "Tuesday"],
  ["3", "Wednesday"],
  ["4", "Thursday"],
  ["5", "Friday"],
  ["6", "Saturday"],
  ["7", "Sunday"],
];

function defaultForm(level = "P1", subject = "English"): ClassForm {
  const commonSubject = DEFAULT_SUBJECTS.includes(subject) ? subject : "Other";
  return {
    class_name: "",
    academic_levels: [level],
    subject_choice: commonSubject,
    other_subject: commonSubject === "Other" ? subject : "",
    programme_id: "",
    regular_weekday: "1",
    start_time: "15:30",
    end_time: "17:30",
    capacity: "8",
    manual_enrolled_count: "0",
    teacher_name: "",
    room: "",
    notes: "",
  };
}

export default function LessonSchedulingClient() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  const [selectedLevel, setSelectedLevel] = useState(ALL_LEVELS);
  const [selectedSubject, setSelectedSubject] = useState(ALL_SUBJECTS);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState("");
  const [classForm, setClassForm] = useState<ClassForm>(defaultForm());
  const [formError, setFormError] = useState("");

  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassSchedule | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const [scheduleResult, programmeResult] = await Promise.all([
      supabase.rpc("gkp_list_class_schedules_v2"),
      supabase.rpc("gkp_list_scheduling_programmes"),
    ]);

    const firstError = scheduleResult.error || programmeResult.error;
    if (firstError) {
      setLoadError(firstError.message);
      setLoading(false);
      return;
    }

    const nextSchedules = (scheduleResult.data || []) as ClassSchedule[];
    setSchedules(nextSchedules);
    setProgrammes((programmeResult.data || []) as Programme[]);

    if (nextSchedules.length > 0) {
      const stillValid = nextSchedules.some((item) => {
        const levelMatches =
          selectedLevel === ALL_LEVELS || item.academic_levels.includes(selectedLevel);
        const subjectMatches =
          selectedSubject === ALL_SUBJECTS || item.subject === selectedSubject;
        return levelMatches && subjectMatches;
      });

      if (!stillValid && selectedLevel !== ALL_LEVELS && selectedSubject !== ALL_SUBJECTS) {
        setSelectedLevel(
          nextSchedules[0].academic_levels[0] || nextSchedules[0].academic_level,
        );
        setSelectedSubject(nextSchedules[0].subject);
      }
    }

    setLoading(false);
  }, [selectedLevel, selectedSubject]);

  useEffect(() => {
    void loadData();
    // Initial load only. Filters are local and do not need a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const levelOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_LEVELS,
          ...schedules.flatMap((item) => item.academic_levels || []).filter(Boolean),
        ]),
      ),
    [schedules],
  );

  const subjectOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_SUBJECTS,
          ...schedules.map((item) => item.subject).filter(Boolean),
        ]),
      ),
    [schedules],
  );

  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      if (
        selectedLevel !== ALL_LEVELS &&
        !item.academic_levels.includes(selectedLevel)
      ) {
        return false;
      }
      if (selectedSubject !== ALL_SUBJECTS && item.subject !== selectedSubject) {
        return false;
      }
      if (!showInactive && item.status !== "active") return false;
      if (
        availableOnly &&
        (item.status !== "active" || item.available_spaces <= 0)
      ) {
        return false;
      }
      return true;
    });
  }, [availableOnly, schedules, selectedLevel, selectedSubject, showInactive]);

  const summary = useMemo(() => {
    const active = schedules.filter((item) => {
      const levelMatches =
        selectedLevel === ALL_LEVELS || item.academic_levels.includes(selectedLevel);
      const subjectMatches =
        selectedSubject === ALL_SUBJECTS || item.subject === selectedSubject;
      return levelMatches && subjectMatches && item.status === "active";
    });

    return {
      classCount: active.length,
      enrolled: active.reduce(
        (total, item) => total + Number(item.enrolled_count || 0),
        0,
      ),
      spaces: active.reduce(
        (total, item) => total + Number(item.available_spaces || 0),
        0,
      ),
    };
  }, [schedules, selectedLevel, selectedSubject]);

  function openAddClass() {
    const next = defaultForm(
      selectedLevel === ALL_LEVELS ? DEFAULT_LEVELS[1] : selectedLevel,
      selectedSubject === ALL_SUBJECTS ? DEFAULT_SUBJECTS[0] : selectedSubject,
    );
    next.programme_id = programmes[0]?.id || "";
    setEditingClassId("");
    setClassForm(next);
    setFormError("");
    setClassModalOpen(true);
  }

  function openEditClass(item: ClassSchedule) {
    const commonSubject = DEFAULT_SUBJECTS.includes(item.subject)
      ? item.subject
      : "Other";

    setEditingClassId(item.id);
    setClassForm({
      class_name: item.class_name || "",
      academic_levels: item.academic_levels.length
        ? item.academic_levels
        : [item.academic_level],
      subject_choice: commonSubject,
      other_subject: commonSubject === "Other" ? item.subject : "",
      programme_id: item.programme_id,
      regular_weekday: String(item.regular_weekday),
      start_time: item.start_time?.slice(0, 5) || "",
      end_time: item.end_time?.slice(0, 5) || "",
      capacity: String(item.capacity),
      manual_enrolled_count: String(item.manual_enrolled_count || 0),
      teacher_name: item.teacher_name || "",
      room: item.room || "",
      notes: item.notes || "",
    });
    setFormError("");
    setClassModalOpen(true);
  }

  async function saveClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const subject =
      classForm.subject_choice === "Other"
        ? classForm.other_subject.trim()
        : classForm.subject_choice;

    if (!subject) {
      setFormError("Enter a subject.");
      return;
    }

    if (classForm.academic_levels.length === 0) {
      setFormError("Choose at least one level.");
      return;
    }

    if (!classForm.programme_id) {
      setFormError("Choose the billing programme used by this class.");
      return;
    }

    if (!classForm.start_time || !classForm.end_time) {
      setFormError("Enter the class start and end time.");
      return;
    }

    const capacity = Number(classForm.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      setFormError("Class capacity must be a whole number greater than zero.");
      return;
    }

    const manualEnrolledCount = Number(classForm.manual_enrolled_count);
    if (!Number.isInteger(manualEnrolledCount) || manualEnrolledCount < 0) {
      setFormError("Other students must be a whole number of zero or more.");
      return;
    }

    setWorking(true);
    setFormError("");
    setLoadError("");
    setNotice("");

    const { error } = await supabase.rpc("gkp_upsert_class_schedule_v2", {
      p_class_id: editingClassId || null,
      p_class_name: optionalText(classForm.class_name),
      p_academic_levels: classForm.academic_levels,
      p_subject: subject,
      p_programme_id: classForm.programme_id,
      p_regular_weekday: Number(classForm.regular_weekday),
      p_start_time: classForm.start_time,
      p_end_time: classForm.end_time,
      p_capacity: capacity,
      p_manual_enrolled_count: manualEnrolledCount,
      p_teacher_name: optionalText(classForm.teacher_name),
      p_room: optionalText(classForm.room),
      p_notes: optionalText(classForm.notes),
    });

    if (error) {
      setFormError(error.message);
    } else {
      setClassModalOpen(false);
      setSelectedLevel(classForm.academic_levels[0]);
      setSelectedSubject(subject);
      setNotice(editingClassId ? "Class schedule updated." : "Class schedule added.");
      await loadData();
    }

    setWorking(false);
  }

  async function setClassStatus(item: ClassSchedule) {
    const nextStatus = item.status === "active" ? "inactive" : "active";

    if (
      nextStatus === "inactive" &&
      !window.confirm(
        `Deactivate ${classLabel(item)}? Active students must be moved or removed first.`,
      )
    ) {
      return;
    }

    setWorking(true);
    setLoadError("");
    setNotice("");

    const { error } = await supabase.rpc("gkp_set_class_schedule_status", {
      p_class_id: item.id,
      p_status: nextStatus,
    });

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice(
        nextStatus === "active"
          ? "Class reactivated."
          : "Class deactivated.",
      );
      await loadData();
    }

    setWorking(false);
  }

  const loadRoster = useCallback(async (classItem: ClassSchedule) => {
    setRosterLoading(true);
    setLoadError("");

    const [rosterResult, candidateResult] = await Promise.all([
      supabase.rpc("gkp_get_class_roster", { p_class_id: classItem.id }),
      supabase.rpc("gkp_get_class_candidates", { p_class_id: classItem.id }),
    ]);

    const firstError = rosterResult.error || candidateResult.error;
    if (firstError) {
      setLoadError(firstError.message);
      setRoster([]);
      setCandidates([]);
    } else {
      setRoster((rosterResult.data || []) as RosterRow[]);
      setCandidates((candidateResult.data || []) as CandidateRow[]);
    }

    setRosterLoading(false);
  }, []);

  async function openRoster(item: ClassSchedule) {
    setSelectedClass(item);
    setStudentSearch("");
    setRosterModalOpen(true);
    await loadRoster(item);
  }

  async function assignStudent(candidate: CandidateRow) {
    if (!selectedClass) return;

    if (
      candidate.class_schedule_id !== selectedClass.id &&
      roster.length + selectedClass.manual_enrolled_count >= selectedClass.capacity &&
      !window.confirm(
        `${classLabel(selectedClass)} is already at its stated capacity (${roster.length + selectedClass.manual_enrolled_count}/${selectedClass.capacity}). Assign ${candidate.student_name} anyway?`,
      )
    ) {
      return;
    }

    if (
      candidate.class_schedule_id &&
      candidate.class_schedule_id !== selectedClass.id &&
      !window.confirm(
        `${candidate.student_name} is currently in ${candidate.assigned_class_label || "another class"}. Move the student to ${classLabel(selectedClass)}?`,
      )
    ) {
      return;
    }

    setWorking(true);
    setLoadError("");

    const { error } = await supabase.rpc("gkp_assign_enrolment_to_class", {
      p_enrolment_id: candidate.enrolment_id,
      p_class_id: selectedClass.id,
    });

    if (error) {
      setLoadError(error.message);
    } else {
      await Promise.all([loadRoster(selectedClass), loadData()]);
    }

    setWorking(false);
  }

  async function removeStudent(row: RosterRow) {
    if (!selectedClass) return;

    if (
      !window.confirm(
        `Remove ${row.student_name} from ${classLabel(selectedClass)}? Their existing billing weekday/time will be kept until they are assigned to another class.`,
      )
    ) {
      return;
    }

    setWorking(true);
    setLoadError("");

    const { error } = await supabase.rpc("gkp_unassign_enrolment_from_class", {
      p_enrolment_id: row.enrolment_id,
      p_class_id: selectedClass.id,
    });

    if (error) {
      setLoadError(error.message);
    } else {
      await Promise.all([loadRoster(selectedClass), loadData()]);
    }

    setWorking(false);
  }

  async function matchExistingStudents() {
    if (
      !window.confirm(
        "Match existing active enrolments to classes where programme, one of the class levels, weekday and start time identify exactly one class? Ambiguous records will be left unchanged.",
      )
    ) {
      return;
    }

    setWorking(true);
    setLoadError("");
    setNotice("");

    const { data, error } = await supabase.rpc(
      "gkp_backfill_class_schedule_assignments",
    );

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice(`${Number(data || 0)} existing enrolments matched to classes.`);
      await loadData();
    }

    setWorking(false);
  }

  async function changeManualCount(item: ClassSchedule, nextCount: number) {
    const safeCount = Math.max(0, Math.floor(nextCount));
    if (safeCount === item.manual_enrolled_count) return;

    setWorking(true);
    setLoadError("");
    setNotice("");

    const { error } = await supabase.rpc(
      "gkp_set_class_manual_enrolled_count",
      {
        p_class_id: item.id,
        p_manual_enrolled_count: safeCount,
      },
    );

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice(`Manual class count updated for ${classLabel(item)}.`);
      setSchedules((current) =>
        current.map((currentItem) => {
          if (currentItem.id !== item.id) return currentItem;
          const total = currentItem.tracked_enrolled_count + safeCount;
          return {
            ...currentItem,
            manual_enrolled_count: safeCount,
            enrolled_count: total,
            available_spaces: Math.max(0, currentItem.capacity - total),
          };
        }),
      );
      setSelectedClass((current) => {
        if (!current || current.id !== item.id) return current;
        const total = current.tracked_enrolled_count + safeCount;
        return {
          ...current,
          manual_enrolled_count: safeCount,
          enrolled_count: total,
          available_spaces: Math.max(0, current.capacity - total),
        };
      });
    }

    setWorking(false);
  }

  async function copyAvailability() {
    const current = schedules.filter((item) => {
      const levelMatches =
        selectedLevel === ALL_LEVELS || item.academic_levels.includes(selectedLevel);
      const subjectMatches =
        selectedSubject === ALL_SUBJECTS || item.subject === selectedSubject;
      return (
        levelMatches &&
        subjectMatches &&
        item.status === "active" &&
        item.available_spaces > 0
      );
    });

    if (current.length === 0) {
      setNotice("No available classes in the current view to copy.");
      return;
    }

    const broadView =
      selectedLevel === ALL_LEVELS || selectedSubject === ALL_SUBJECTS;

    const lines = current.map((item) => {
      const classPrefix = broadView
        ? `${item.academic_levels.join("/")} ${item.subject} · `
        : "";
      return `• ${classPrefix}${weekdayShort(item.regular_weekday)} ${formatTime(item.start_time)}–${formatTime(item.end_time)} — ${item.available_spaces} ${item.available_spaces === 1 ? "space" : "spaces"}`;
    });

    const heading =
      selectedLevel === ALL_LEVELS && selectedSubject === ALL_SUBJECTS
        ? "Available classes"
        : `${selectedLevel === ALL_LEVELS ? "All levels" : selectedLevel} · ${selectedSubject === ALL_SUBJECTS ? "All subjects" : selectedSubject} available classes`;

    const text = `${heading}:\n${lines.join("\n")}`;

    try {
      await navigator.clipboard.writeText(text);
      setNotice("Available class times copied to clipboard.");
    } catch {
      setLoadError("The availability text could not be copied.");
    }
  }

  const filteredCandidates = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return candidates;

    return candidates.filter((item) =>
      [
        item.student_name,
        item.academic_level || "",
        item.payer_name,
        item.account_code,
        item.assigned_class_label || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [candidates, studentSearch]);

  return (
    <BillingAdminShell
      eyebrow="Weekly class timetable"
      title="Lesson Scheduling"
      description="Keep one live reference for class times, multi-level groups, total class numbers and available spaces. Named billing students and manually counted existing students can be tracked together."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading || working}
            className="inline-flex min-h-11 items-center rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#554d40] disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={openAddClass}
            disabled={working || programmes.length === 0}
            className="inline-flex min-h-11 items-center rounded-full bg-[#15233b] px-5 text-xs font-bold text-white disabled:opacity-60"
          >
            + Add class
          </button>
        </div>
      }
    >
      {loadError && <Alert tone="error">{loadError}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[220px_240px_minmax(0,1fr)] lg:items-end">
          <SelectField
            label="Level"
            value={selectedLevel}
            onChange={setSelectedLevel}
            options={[
              [ALL_LEVELS, "All levels"],
              ...levelOptions.map((value) => [value, value] as [string, string]),
            ]}
          />
          <SelectField
            label="Subject"
            value={selectedSubject}
            onChange={setSelectedSubject}
            options={[
              [ALL_SUBJECTS, "All subjects"],
              ...subjectOptions.map((value) => [value, value] as [string, string]),
            ]}
          />
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <ToggleButton
              active={availableOnly}
              onClick={() => setAvailableOnly((current) => !current)}
            >
              Available classes only
            </ToggleButton>
            <ToggleButton
              active={showInactive}
              onClick={() => setShowInactive((current) => !current)}
            >
              Show inactive
            </ToggleButton>
            <button
              type="button"
              onClick={() => void copyAvailability()}
              className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold"
            >
              Copy availability
            </button>
            <button
              type="button"
              onClick={() => void matchExistingStudents()}
              disabled={working || schedules.length === 0}
              className="min-h-11 rounded-full border border-[#d7c9ae] bg-[#fbfaf7] px-4 text-xs font-bold disabled:opacity-50"
            >
              Match existing students
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryCell label="Active classes" value={summary.classCount} />
          <SummaryCell label="Students enrolled" value={summary.enrolled} />
          <SummaryCell label="Spaces available" value={summary.spaces} />
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a27627]">
              Current classes
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[#15233b]">
              {selectedLevel === ALL_LEVELS && selectedSubject === ALL_SUBJECTS
                ? "All classes"
                : `${selectedLevel === ALL_LEVELS ? "All levels" : selectedLevel} · ${
                    selectedSubject === ALL_SUBJECTS
                      ? "All subjects"
                      : selectedSubject
                  }`}
            </h2>
          </div>
          <p className="text-sm text-[#81796d]">
            {filteredSchedules.length} {filteredSchedules.length === 1 ? "class" : "classes"} shown
          </p>
        </div>

        {loading ? (
          <div className="rounded-[2rem] border border-[#ded5c4] bg-white p-10 text-sm text-[#81796d]">
            Loading lesson schedules…
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-[#d7c9ae] bg-white px-6 py-14 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1eadc] text-xl font-black text-[#9b7029]">
              0
            </div>
            <h3 className="mt-4 text-lg font-semibold">No classes match this view</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#81796d]">
              No classes match the selected filters. Change the level or subject, or turn off the availability filter if matching classes are full.
            </p>
            <button
              type="button"
              onClick={openAddClass}
              className="mt-5 min-h-11 rounded-full bg-[#15233b] px-5 text-xs font-bold text-white"
            >
              + Add class
            </button>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {filteredSchedules.map((item) => (
              <ClassCard
                key={item.id}
                item={item}
                disabled={working}
                onEdit={() => openEditClass(item)}
                onRoster={() => void openRoster(item)}
                onStatus={() => void setClassStatus(item)}
                onManualChange={(nextCount) =>
                  void changeManualCount(item, nextCount)
                }
              />
            ))}
          </div>
        )}
      </section>

      <BillingModal
        open={classModalOpen}
        onClose={() => !working && setClassModalOpen(false)}
        eyebrow={editingClassId ? "Class timetable" : "New weekly class"}
        title={editingClassId ? "Edit class" : "Add class"}
        description="A class can cover multiple levels. Add a manual count for existing students who are not in the billing system; named billing students are counted separately."
        widthClass="max-w-3xl"
        footer={
          <ModalFooter
            formId="class-schedule-form"
            saving={working}
            submitLabel={editingClassId ? "Save class" : "Add class"}
            onCancel={() => setClassModalOpen(false)}
          />
        }
      >
        <form
          id="class-schedule-form"
          onSubmit={saveClass}
          className="grid gap-5"
        >
          {formError && <Alert tone="error">{formError}</Alert>}

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Class name (optional)"
              placeholder="e.g. P2 English A"
              value={classForm.class_name}
              onChange={(value) =>
                setClassForm((current) => ({ ...current, class_name: value }))
              }
            />
            <div className="md:col-span-2">
              <MultiLevelField
                label="Levels"
                values={classForm.academic_levels}
                options={levelOptions}
                onChange={(values) =>
                  setClassForm((current) => ({
                    ...current,
                    academic_levels: values,
                  }))
                }
              />
            </div>
            <SelectField
              label="Subject"
              value={classForm.subject_choice}
              onChange={(value) =>
                setClassForm((current) => ({
                  ...current,
                  subject_choice: value,
                }))
              }
              options={[
                ...DEFAULT_SUBJECTS.map((value) => [value, value] as [string, string]),
                ["Other", "Other"],
              ]}
            />
            {classForm.subject_choice === "Other" && (
              <TextField
                label="Other subject"
                value={classForm.other_subject}
                onChange={(value) =>
                  setClassForm((current) => ({
                    ...current,
                    other_subject: value,
                  }))
                }
                required
              />
            )}
            <div className={classForm.subject_choice === "Other" ? "md:col-span-2" : ""}>
              <SelectField
                label="Billing programme"
                value={classForm.programme_id}
                onChange={(value) =>
                  setClassForm((current) => ({
                    ...current,
                    programme_id: value,
                  }))
                }
                options={[
                  ["", "Select programme"],
                  ...programmes.map(
                    (programme) =>
                      [programme.id, `${programme.name} (${programme.code})`] as [
                        string,
                        string,
                      ],
                  ),
                ]}
                required
              />
            </div>
            <SelectField
              label="Day"
              value={classForm.regular_weekday}
              onChange={(value) =>
                setClassForm((current) => ({
                  ...current,
                  regular_weekday: value,
                }))
              }
              options={WEEKDAYS}
              required
            />
            <TextField
              label="Maximum class size"
              type="number"
              min="1"
              step="1"
              value={classForm.capacity}
              onChange={(value) =>
                setClassForm((current) => ({ ...current, capacity: value }))
              }
              required
            />
            <TextField
              label="Other students (not in billing system)"
              type="number"
              min="0"
              step="1"
              value={classForm.manual_enrolled_count}
              onChange={(value) =>
                setClassForm((current) => ({
                  ...current,
                  manual_enrolled_count: value,
                }))
              }
              required
            />
            <TextField
              label="Start time"
              type="time"
              value={classForm.start_time}
              onChange={(value) =>
                setClassForm((current) => ({ ...current, start_time: value }))
              }
              required
            />
            <TextField
              label="End time"
              type="time"
              value={classForm.end_time}
              onChange={(value) =>
                setClassForm((current) => ({ ...current, end_time: value }))
              }
              required
            />
            <TextField
              label="Teacher (optional)"
              value={classForm.teacher_name}
              onChange={(value) =>
                setClassForm((current) => ({
                  ...current,
                  teacher_name: value,
                }))
              }
            />
            <TextField
              label="Room (optional)"
              value={classForm.room}
              onChange={(value) =>
                setClassForm((current) => ({ ...current, room: value }))
              }
            />
          </div>

          <TextAreaField
            label="Internal notes"
            value={classForm.notes}
            onChange={(value) =>
              setClassForm((current) => ({ ...current, notes: value }))
            }
            placeholder="e.g. Suitable for new P2 intake"
          />

          <div className="rounded-2xl border border-[#decda9] bg-[#f8f1e3] p-4 text-xs leading-5 text-[#6d6250]">
            The class total combines named billing students and the manual count above. When a named student is assigned, their enrolment weekday and start time stay aligned with this class.
          </div>
        </form>
      </BillingModal>

      <BillingModal
        open={rosterModalOpen}
        onClose={() => !working && setRosterModalOpen(false)}
        eyebrow="Class roster"
        title={selectedClass ? classLabel(selectedClass) : "Manage students"}
        description={
          selectedClass
            ? `${weekdayName(selectedClass.regular_weekday)} ${formatTime(selectedClass.start_time)}–${formatTime(selectedClass.end_time)} · ${selectedClass.programme_name}`
            : "Assign active student enrolments to this class."
        }
        widthClass="max-w-5xl"
        footer={
          <button
            type="button"
            onClick={() => setRosterModalOpen(false)}
            className="min-h-11 rounded-full bg-[#15233b] px-5 text-xs font-bold text-white"
          >
            Done
          </button>
        }
      >
        {rosterLoading || !selectedClass ? (
          <div className="py-10 text-center text-sm text-[#81796d]">
            Loading class roster…
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCell
                label="Total enrolled"
                value={roster.length + selectedClass.manual_enrolled_count}
              />
              <SummaryCell label="Named billing students" value={roster.length} />
              <SummaryCell
                label="Other students"
                value={selectedClass.manual_enrolled_count}
              />
              <SummaryCell
                label="Available"
                value={Math.max(
                  0,
                  selectedClass.capacity -
                    roster.length -
                    selectedClass.manual_enrolled_count,
                )}
              />
            </div>

            <section className="rounded-2xl border border-[#ded5c4] bg-[#fbfaf7] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9a7029]">
                    Current students
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">Class roster</h3>
                </div>
                <span className="rounded-full border border-[#d8c59e] bg-white px-3 py-1.5 text-xs font-black">
                  {roster.length}
                </span>
              </div>

              {roster.length === 0 ? (
                <p className="mt-4 text-sm text-[#81796d]">No students are assigned yet.</p>
              ) : (
                <div className="mt-4 grid gap-2">
                  {roster.map((row) => (
                    <div
                      key={row.enrolment_id}
                      className="flex flex-col justify-between gap-3 rounded-2xl border border-[#e4ddcf] bg-white p-4 sm:flex-row sm:items-center"
                    >
                      <div>
                        <strong className="block text-sm text-[#15233b]">
                          {row.student_name}
                        </strong>
                        <span className="mt-1 block text-xs text-[#81796d]">
                          {row.academic_level || "Level not recorded"} · {row.payer_name} · {row.account_code}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeStudent(row)}
                        disabled={working}
                        className="min-h-9 rounded-full border border-red-200 bg-red-50 px-3 text-[11px] font-bold text-red-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#ded5c4] bg-white p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9a7029]">
                    Programme enrolments
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">Add or move students</h3>
                  <p className="mt-1 text-xs leading-5 text-[#81796d]">
                    This list shows active students enrolled in {selectedClass.programme_name} whose recorded level matches {levelsLabel(selectedClass)}. Students without a recorded level are also shown.
                  </p>
                </div>
                <TextField
                  label="Search students"
                  value={studentSearch}
                  onChange={setStudentSearch}
                  placeholder="Name, parent or level"
                />
              </div>

              <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-[#e4ddcf]">
                {filteredCandidates.length === 0 ? (
                  <div className="p-6 text-sm text-[#81796d]">
                    No matching active enrolments.
                  </div>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const alreadyHere =
                      candidate.class_schedule_id === selectedClass.id;
                    return (
                      <div
                        key={candidate.enrolment_id}
                        className="flex flex-col justify-between gap-3 border-b border-[#eee8dd] p-4 last:border-0 sm:flex-row sm:items-center"
                      >
                        <div>
                          <strong className="block text-sm text-[#15233b]">
                            {candidate.student_name}
                          </strong>
                          <span className="mt-1 block text-xs text-[#81796d]">
                            {candidate.academic_level || "Level not recorded"} · {candidate.payer_name} · {candidate.account_code}
                          </span>
                          {candidate.assigned_class_label && (
                            <span className={`mt-1 block text-xs font-bold ${alreadyHere ? "text-emerald-700" : "text-amber-700"}`}>
                              {alreadyHere
                                ? "Already in this class"
                                : `Currently: ${candidate.assigned_class_label}`}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={working || alreadyHere}
                          onClick={() => void assignStudent(candidate)}
                          className={`min-h-9 rounded-full px-4 text-[11px] font-bold disabled:opacity-50 ${
                            alreadyHere
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : candidate.class_schedule_id
                                ? "border border-amber-200 bg-amber-50 text-amber-800"
                                : "bg-[#15233b] text-white"
                          }`}
                        >
                          {alreadyHere
                            ? "Assigned"
                            : candidate.class_schedule_id
                              ? "Move here"
                              : "Add to class"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}
      </BillingModal>
    </BillingAdminShell>
  );
}

function ClassCard({
  item,
  disabled,
  onEdit,
  onRoster,
  onStatus,
  onManualChange,
}: {
  item: ClassSchedule;
  disabled: boolean;
  onEdit: () => void;
  onRoster: () => void;
  onStatus: () => void;
  onManualChange: (nextCount: number) => void;
}) {
  const full = item.enrolled_count >= item.capacity;
  const over = item.enrolled_count > item.capacity;
  const low = !full && item.available_spaces <= 2;

  const availabilityClass = over || full
    ? "border-red-200 bg-red-50 text-red-700"
    : low
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  const availabilityLabel = over
    ? `Over by ${item.enrolled_count - item.capacity}`
    : full
      ? "Full"
      : `${item.available_spaces} ${item.available_spaces === 1 ? "space" : "spaces"}`;

  return (
    <article
      className={`rounded-[2rem] border bg-white p-5 shadow-[0_18px_50px_rgba(21,35,59,0.04)] ${
        item.status === "inactive" ? "border-slate-200 opacity-70" : "border-[#ded5c4]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#15233b] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#f0cf87]">
              {weekdayName(item.regular_weekday)}
            </span>
            {item.status === "inactive" && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase text-slate-600">
                Inactive
              </span>
            )}
          </div>
          <h3 className="mt-4 truncate text-xl font-semibold text-[#15233b]">
            {classLabel(item)}
          </h3>
          <p className="mt-1 text-sm font-bold text-[#9a7029]">
            {formatTime(item.start_time)} – {formatTime(item.end_time)}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#81796d]">
            {item.programme_name}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black ${availabilityClass}`}>
          {availabilityLabel}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <MiniMetric label="Enrolled" value={item.enrolled_count} />
        <MiniMetric label="Capacity" value={item.capacity} />
        <MiniMetric label="Available" value={item.available_spaces} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#e6ddcd] bg-[#fbfaf7] px-3 py-3">
        <div className="min-w-0">
          <span className="block text-[9px] font-black uppercase tracking-[0.1em] text-[#8a8378]">
            Other students
          </span>
          <span className="mt-1 block text-[11px] text-[#81796d]">
            {item.tracked_enrolled_count} named + {item.manual_enrolled_count} manual
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onManualChange(Math.max(0, item.manual_enrolled_count - 1))
            }
            disabled={disabled || item.manual_enrolled_count <= 0}
            className="grid h-9 w-9 place-items-center rounded-full border border-[#d7c9ae] bg-white text-lg font-bold disabled:opacity-40"
            aria-label="Remove one manual student"
          >
            −
          </button>
          <strong className="min-w-8 text-center text-lg text-[#15233b]">
            {item.manual_enrolled_count}
          </strong>
          <button
            type="button"
            onClick={() => onManualChange(item.manual_enrolled_count + 1)}
            disabled={disabled}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#15233b] text-lg font-bold text-white disabled:opacity-40"
            aria-label="Add one manual student"
          >
            +
          </button>
        </div>
      </div>

      {(item.teacher_name || item.room) && (
        <p className="mt-4 text-xs text-[#81796d]">
          {[item.teacher_name, item.room].filter(Boolean).join(" · ")}
        </p>
      )}

      {item.notes && (
        <p className="mt-2 text-xs leading-5 text-[#81796d]">{item.notes}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#eee8dd] pt-4">
        <button
          type="button"
          onClick={onRoster}
          disabled={disabled}
          className="min-h-9 rounded-full bg-[#15233b] px-4 text-[11px] font-bold text-white disabled:opacity-50"
        >
          View students
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className="min-h-9 rounded-full border border-[#d7c9ae] bg-white px-4 text-[11px] font-bold disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onStatus}
          disabled={disabled}
          className={`min-h-9 rounded-full border px-4 text-[11px] font-bold disabled:opacity-50 ${
            item.status === "active"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {item.status === "active" ? "Deactivate" : "Reactivate"}
        </button>
      </div>
    </article>
  );
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#e1d7c6] bg-[#fbfaf7] p-4">
      <span className="text-[10px] font-black uppercase tracking-[0.13em] text-[#8a8378]">
        {label}
      </span>
      <strong className="mt-2 block text-2xl font-semibold text-[#15233b]">
        {value}
      </strong>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#f8f5ef] p-3 text-center">
      <strong className="block text-lg text-[#15233b]">{value}</strong>
      <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.08em] text-[#938b7e]">
        {label}
      </span>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-xs font-bold transition ${
        active
          ? "border-[#15233b] bg-[#15233b] text-white"
          : "border-[#d7c9ae] bg-white text-[#554d40]"
      }`}
    >
      {children}
    </button>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      className={`mb-5 rounded-2xl border p-4 text-sm leading-6 ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.13em] text-[#82796d]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        className="mt-2 min-h-11 w-full rounded-2xl border border-[#dcd3c3] bg-white px-4 text-sm outline-none focus:border-[#b98d3f]"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.13em] text-[#82796d]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-2 w-full rounded-2xl border border-[#dcd3c3] bg-white px-4 py-3 text-sm outline-none focus:border-[#b98d3f]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.13em] text-[#82796d]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 min-h-11 w-full rounded-2xl border border-[#dcd3c3] bg-white px-4 text-sm outline-none focus:border-[#b98d3f]"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={`${label}-${optionValue}`} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function MultiLevelField({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
    } else {
      onChange([...values, value]);
    }
  }

  return (
    <div>
      <span className="text-[11px] font-black uppercase tracking-[0.13em] text-[#82796d]">
        {label}
      </span>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={`min-h-10 rounded-full border px-4 text-xs font-bold transition ${
                active
                  ? "border-[#15233b] bg-[#15233b] text-white"
                  : "border-[#d7c9ae] bg-white text-[#554d40]"
              }`}
            >
              {active ? "✓ " : ""}
              {option}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[#8a8378]">
        Choose one or more levels for this class.
      </p>
    </div>
  );
}

function ModalFooter({
  formId,
  saving,
  submitLabel,
  onCancel,
}: {
  formId: string;
  saving: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        form={formId}
        disabled={saving}
        className="min-h-11 rounded-full bg-[#15233b] px-5 text-xs font-bold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function levelsLabel(item: ClassSchedule) {
  const levels = item.academic_levels?.length
    ? item.academic_levels
    : [item.academic_level];
  return levels.join("/");
}

function classLabel(item: ClassSchedule) {
  return item.class_name?.trim() || `${levelsLabel(item)} ${item.subject}`;
}

function weekdayName(value: number) {
  return WEEKDAYS.find(([id]) => Number(id) === Number(value))?.[1] || "Day";
}

function weekdayShort(value: number) {
  return weekdayName(value).slice(0, 3);
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const [hourText, minuteText = "00"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const suffix = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")}${suffix}`;
}
