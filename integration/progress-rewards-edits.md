# `app/learning-missions/progress-rewards/page.tsx` edits

Add this import with the other component imports:

```tsx
import ParentalControlsPanel from "@/components/parental-controls/ParentalControlsPanel";
```

Directly after the closing `</header>` for the dashboard hero, add:

```tsx
<ParentalControlsPanel
  studentUserId={selectedStudentId}
  studentLabel={selectedStudent?.label || "Student"}
  viewerRole={viewerRole}
/>
```

When loading `learning_dashboard_access`, also filter inactive links:

```tsx
.eq("viewer_user_id", user.id)
.eq("is_active", true)
.order("student_label", { ascending: true });
```

No other dashboard state or query needs to change.
