"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type TeachingClassRow = {
  class_id: string;
  organisation_id: string;
  class_name: string;
  subject: string;
  primary_level: number | null;
  day_of_week: number | null;
  start_time: string | null;
  timezone: string;
  capacity: number | null;
  status: string;
  teacher_role: string | null;
  student_count: number;
  created_at: string;
  updated_at: string;
};

type OrganisationStudent = {
  membership_id: string;
  organisation_id: string;
  organisation_name: string;
  student_user_id: string;
  student_label: string;
  student_email: string | null;
  joined_at: string;
};

type ClassStudent = {
  class_student_id: string;
  student_user_id: string;
  student_label: string;
  student_email: string | null;
  joined_at: string;
};

type OrganisationStaff = {
  user_id: string;
  display_name: string;
  email: string | null;
  membership_role: string;
};

type ClassTeacher = {
  class_teacher_id: string;
  teacher_user_id: string;
  teacher_label: string;
  teacher_email: string | null;
  teacher_role: string;
  status: string;
  assigned_at: string;
};

const DAYS = [
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
  [7, "Sunday"],
] as const;

const SUBJECTS = [
  ["english", "English"],
  ["math", "Mathematics"],
  ["science", "Science"],
  ["thinking", "Thinking Skills"],
  ["knowledge", "Knowledge Arena"],
  ["other", "Other"],
] as const;

const inputClass =
  "min-h-12 w-full rounded-2xl border border-cyan-200/16 bg-[#061632]/90 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-200/45";

export default function ClassManagerModal({
  organisationId,
  organisationName,
  existingClass,
  onClose,
  onSaved,
}: {
  organisationId: string;
  organisationName: string;
  existingClass: TeachingClassRow | null;
  onClose: () => void;
  onSaved: (classId: string) => void | Promise<void>;
}) {
  const [classId, setClassId] = useState(existingClass?.class_id || "");
  const [className, setClassName] = useState(existingClass?.class_name || "");
  const [subject, setSubject] = useState(existingClass?.subject || "english");
  const [primaryLevel, setPrimaryLevel] = useState(
    existingClass?.primary_level ? String(existingClass.primary_level) : "",
  );
  const [dayOfWeek, setDayOfWeek] = useState(
    existingClass?.day_of_week ? String(existingClass.day_of_week) : "",
  );
  const [startTime, setStartTime] = useState(
    existingClass?.start_time?.slice(0, 5) || "",
  );
  const [capacity, setCapacity] = useState(
    existingClass?.capacity ? String(existingClass.capacity) : "",
  );
  const [timezone, setTimezone] = useState(
    existingClass?.timezone || "Asia/Singapore",
  );

  const [organisationStudents, setOrganisationStudents] = useState<
    OrganisationStudent[]
  >([]);
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [organisationStaff, setOrganisationStaff] = useState<OrganisationStaff[]>([]);
  const [classTeachers, setClassTeachers] = useState<ClassTeacher[]>([]);

  const [studentSearch, setStudentSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [newTeacherRole, setNewTeacherRole] = useState("co_teacher");

  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const activeClassStudentIds = useMemo(
    () => new Set(classStudents.map((student) => student.student_user_id)),
    [classStudents],
  );

  const activeClassTeacherIds = useMemo(
    () => new Set(classTeachers.map((teacher) => teacher.teacher_user_id)),
    [classTeachers],
  );

  const filteredStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();

    return organisationStudents.filter((student) => {
      if (!term) return true;

      return (
        student.student_label.toLowerCase().includes(term) ||
        String(student.student_email || "").toLowerCase().includes(term)
      );
    });
  }, [organisationStudents, studentSearch]);

  const filteredStaff = useMemo(() => {
    const term = teacherSearch.trim().toLowerCase();

    return organisationStaff.filter((staff) => {
      if (!term) return true;

      return (
        staff.display_name.toLowerCase().includes(term) ||
        String(staff.email || "").toLowerCase().includes(term)
      );
    });
  }, [organisationStaff, teacherSearch]);

  useEffect(() => {
    if (!classId) return;
    void loadClassMembers(classId);
  }, [classId]);

  async function loadClassMembers(targetClassId: string) {
    setLoadingMembers(true);
    setErrorMessage("");

    const [rosterResult, studentResult, staffResult, teacherResult] =
      await Promise.all([
        supabase.rpc("get_my_organisation_roster", {
          p_organisation_id: organisationId,
        }),
        supabase.rpc("get_teacher_dashboard_class_students", {
          p_class_id: targetClassId,
        }),
        supabase.rpc("get_organisation_staff_directory", {
          p_organisation_id: organisationId,
        }),
        supabase.rpc("get_teaching_class_teachers", {
          p_class_id: targetClassId,
        }),
      ]);

    const firstError =
      rosterResult.error ||
      studentResult.error ||
      staffResult.error ||
      teacherResult.error;

    if (firstError) {
      setErrorMessage(
        firstError.message || "Class membership information could not be loaded.",
      );
    }

    setOrganisationStudents(
      (rosterResult.data || []) as OrganisationStudent[],
    );
    setClassStudents((studentResult.data || []) as ClassStudent[]);
    setOrganisationStaff((staffResult.data || []) as OrganisationStaff[]);
    setClassTeachers((teacherResult.data || []) as ClassTeacher[]);
    setLoadingMembers(false);
  }

  function nullableInteger(value: string) {
    const clean = value.trim();
    if (!clean) return null;
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? Math.floor(parsed) : null;
  }

  async function saveClass() {
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    if (!className.trim()) {
      setSaving(false);
      setErrorMessage("Enter a class name.");
      return;
    }

    if (!classId) {
      const { data, error } = await supabase.rpc("create_teaching_class", {
        p_organisation_id: organisationId,
        p_class_name: className.trim(),
        p_subject: subject,
        p_primary_level: nullableInteger(primaryLevel),
        p_day_of_week: nullableInteger(dayOfWeek),
        p_start_time: startTime || null,
        p_capacity: nullableInteger(capacity),
        p_timezone: timezone.trim() || "Asia/Singapore",
      });

      setSaving(false);

      if (error) {
        setErrorMessage(error.message || "Class could not be created.");
        return;
      }

      const createdId = String(data || "");
      setClassId(createdId);
      setMessage(
        "Class created. You can now add students and additional teachers.",
      );
      await loadClassMembers(createdId);
      await onSaved(createdId);
      return;
    }

    const { error } = await supabase.rpc("update_teaching_class", {
      p_class_id: classId,
      p_class_name: className.trim(),
      p_subject: subject,
      p_primary_level: nullableInteger(primaryLevel),
      p_day_of_week: nullableInteger(dayOfWeek),
      p_start_time: startTime || null,
      p_capacity: nullableInteger(capacity),
      p_timezone: timezone.trim() || "Asia/Singapore",
      p_status: "active",
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Class could not be updated.");
      return;
    }

    setMessage("Class details saved.");
    await onSaved(classId);
  }

  async function toggleStudent(student: OrganisationStudent) {
    if (!classId) {
      setErrorMessage("Create the class before adding students.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const isAssigned = activeClassStudentIds.has(student.student_user_id);

    const { error } = isAssigned
      ? await supabase.rpc("remove_student_from_teaching_class", {
          p_class_id: classId,
          p_student_user_id: student.student_user_id,
        })
      : await supabase.rpc("add_student_to_teaching_class", {
          p_class_id: classId,
          p_student_user_id: student.student_user_id,
        });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Student assignment could not be updated.");
      return;
    }

    setMessage(
      isAssigned
        ? `${student.student_label} removed from the class.`
        : `${student.student_label} added to the class.`,
    );

    await loadClassMembers(classId);
    await onSaved(classId);
  }

  async function toggleTeacher(staff: OrganisationStaff) {
    if (!classId) {
      setErrorMessage("Create the class before assigning teachers.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const isAssigned = activeClassTeacherIds.has(staff.user_id);

    const { error } = isAssigned
      ? await supabase.rpc("remove_teacher_from_teaching_class", {
          p_class_id: classId,
          p_teacher_user_id: staff.user_id,
        })
      : await supabase.rpc("assign_teacher_to_teaching_class", {
          p_class_id: classId,
          p_teacher_user_id: staff.user_id,
          p_teacher_role:
            staff.membership_role === "curriculum_lead"
              ? "curriculum_lead"
              : newTeacherRole,
        });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Teacher assignment could not be updated.");
      return;
    }

    setMessage(
      isAssigned
        ? `${staff.display_name} removed from the class.`
        : `${staff.display_name} assigned to the class.`,
    );

    await loadClassMembers(classId);
    await onSaved(classId);
  }

  async function archiveClass() {
    if (!classId) return;

    const confirmed = window.confirm(
      "Archive this class? Historical student records remain stored, but the class will disappear from active Teacher Dashboard lists.",
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("archive_teaching_class", {
      p_class_id: classId,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Class could not be archived.");
      return;
    }

    await onSaved(classId);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[140] overflow-y-auto bg-[#01050d]/82 px-4 py-6 backdrop-blur-lg"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={classId ? "Manage class" : "Create class"}
        onMouseDown={(event) => event.stopPropagation()}
        className="mx-auto w-full max-w-6xl overflow-hidden rounded-[32px] border border-cyan-200/24 bg-[#071329] text-white shadow-[0_40px_120px_rgba(0,0,0,0.62)]"
      >
        <header className="flex flex-col gap-4 border-b border-cyan-100/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#8dfcff]">
              {organisationName}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              {classId ? "Manage Class" : "Create New Class"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 rounded-full border border-white/14 bg-white/[0.06] text-xl"
          >
            ×
          </button>
        </header>

        <div className="grid gap-6 p-6 xl:grid-cols-[0.82fr_1.18fr]">
          <section className="rounded-[26px] border border-cyan-200/14 bg-white/[0.035] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100/72">
              Class details
            </p>

            <div className="mt-5 grid gap-4">
              <label>
                <span className="mb-2 block text-xs text-white/46">Class name</span>
                <input
                  value={className}
                  onChange={(event) => setClassName(event.target.value)}
                  className={inputClass}
                  placeholder="P5 English — Wednesday 5 PM"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs text-white/46">Subject</span>
                  <select
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className={inputClass}
                  >
                    {SUBJECTS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs text-white/46">
                    Primary level
                  </span>
                  <select
                    value={primaryLevel}
                    onChange={(event) => setPrimaryLevel(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Not specified</option>
                    {[1, 2, 3, 4, 5, 6].map((level) => (
                      <option key={level} value={level}>
                        Primary {level}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs text-white/46">Day</span>
                  <select
                    value={dayOfWeek}
                    onChange={(event) => setDayOfWeek(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Not specified</option>
                    {DAYS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs text-white/46">Start time</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs text-white/46">Capacity</span>
                  <input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(event) => setCapacity(event.target.value)}
                    className={inputClass}
                    placeholder="Blank = no class cap"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs text-white/46">Timezone</span>
                  <input
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
            </div>

            {message && (
              <p className="mt-5 rounded-2xl border border-green-200/18 bg-green-400/10 px-4 py-3 text-sm text-green-100">
                {message}
              </p>
            )}

            {errorMessage && (
              <p className="mt-5 rounded-2xl border border-red-200/18 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {errorMessage}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveClass()}
                className="min-h-12 rounded-full border border-cyan-200/28 bg-cyan-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.12em] disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : classId
                    ? "Save Class"
                    : "Create Class"}
              </button>

              {classId && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void archiveClass()}
                  className="min-h-12 rounded-full border border-red-200/20 bg-red-400/10 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-red-100 disabled:opacity-50"
                >
                  Archive
                </button>
              )}
            </div>
          </section>

          <section className="min-w-0 space-y-6">
            {!classId ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-[26px] border border-white/10 bg-white/[0.025] p-8 text-center text-white/48">
                Create the class first. Student and teacher assignment controls will
                appear here immediately afterward.
              </div>
            ) : loadingMembers ? (
              <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-8 text-white/48">
                Loading organisation roster...
              </div>
            ) : (
              <>
                <section className="rounded-[26px] border border-emerald-200/14 bg-emerald-300/[0.035] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
                        Students
                      </p>
                      <h3 className="mt-2 text-2xl font-black">
                        {classStudents.length} in this class
                      </h3>
                    </div>

                    <input
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      className="min-h-11 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm text-white outline-none"
                      placeholder="Search organisation roster"
                    />
                  </div>

                  <div className="mt-4 grid max-h-[360px] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                    {filteredStudents.map((student) => {
                      const assigned = activeClassStudentIds.has(
                        student.student_user_id,
                      );

                      return (
                        <button
                          type="button"
                          key={student.student_user_id}
                          disabled={saving}
                          onClick={() => void toggleStudent(student)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            assigned
                              ? "border-emerald-200/32 bg-emerald-300/10"
                              : "border-white/10 bg-white/[0.025] hover:border-emerald-200/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <strong className="block truncate text-sm">
                                {student.student_label}
                              </strong>
                              <span className="mt-1 block truncate text-[10px] text-white/40">
                                {student.student_email || "No email"}
                              </span>
                            </div>
                            <span className="shrink-0 text-xs font-extrabold text-emerald-200">
                              {assigned ? "Added" : "Add"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-[26px] border border-violet-200/14 bg-violet-300/[0.035] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-200">
                        Teaching team
                      </p>
                      <h3 className="mt-2 text-2xl font-black">
                        {classTeachers.length} active teacher
                        {classTeachers.length === 1 ? "" : "s"}
                      </h3>
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={newTeacherRole}
                        onChange={(event) => setNewTeacherRole(event.target.value)}
                        className="min-h-11 rounded-full border border-white/12 bg-[#061632] px-3 text-xs text-white outline-none"
                      >
                        <option value="co_teacher">Co-teacher</option>
                        <option value="relief_teacher">Relief teacher</option>
                        <option value="lead_teacher">Lead teacher</option>
                      </select>
                      <input
                        value={teacherSearch}
                        onChange={(event) => setTeacherSearch(event.target.value)}
                        className="min-h-11 min-w-0 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm text-white outline-none"
                        placeholder="Search staff"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid max-h-[300px] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                    {filteredStaff.map((staff) => {
                      const assigned = activeClassTeacherIds.has(staff.user_id);
                      const activeTeacher = classTeachers.find(
                        (teacher) => teacher.teacher_user_id === staff.user_id,
                      );

                      return (
                        <button
                          type="button"
                          key={staff.user_id}
                          disabled={saving}
                          onClick={() => void toggleTeacher(staff)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            assigned
                              ? "border-violet-200/30 bg-violet-300/10"
                              : "border-white/10 bg-white/[0.025] hover:border-violet-200/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <strong className="block truncate text-sm">
                                {staff.display_name}
                              </strong>
                              <span className="mt-1 block truncate text-[10px] text-white/40">
                                {activeTeacher
                                  ? activeTeacher.teacher_role.replaceAll("_", " ")
                                  : staff.membership_role.replaceAll("_", " ")}
                              </span>
                            </div>
                            <span className="shrink-0 text-xs font-extrabold text-violet-200">
                              {assigned ? "Assigned" : "Assign"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
