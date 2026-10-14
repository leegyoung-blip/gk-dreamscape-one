# DREAMSCAPE ONE — Phase 4C-4D-5A Supabase Metadata Assessment

**Read-only metadata inspection; not authentication, RLS or disclosure certification.**

| Item | Observed |
|---|---:|
| Math quiz RPCs | 3/3 |
| SECURITY DEFINER functions | 3/3 |
| RLS enabled tables | 5/5 |
| Metadata matches expected shape | Yes |
| RPC body and ownership rules reviewed | **No** |
| Student-facing endpoint safe to activate | **Not established** |

## Permissions

| Routine | Anonymous | Authenticated | SECURITY DEFINER |
|---|---|---|---|
| `get_math_quiz_payload` | Denied | Allowed | Yes |
| `save_math_quiz_answer` | Denied | Allowed | Yes |
| `submit_math_quiz_attempt` | Denied | Allowed | Yes |

## Trust boundary

RLS enabled on tables does not establish enforcement within a SECURITY DEFINER function. Functions often execute with owner permissions and may bypass normal row policies unless their effective privilege/ownership rules and SQL bodies are checked. A return value or client checkpoint is not authorization proof.

## Next checks

1. Inspect each exact function definition for auth.uid() and explicit attempt/quiz/question owner binding.
2. Inspect get_math_quiz_payload JSON projection for early answer/teaching content exposure.
3. Inspect actual pg_policies predicates, role grants, table owners and owner RLS bypass.
4. Confirm per-question feedback release is persisted in trusted server data.
5. Build trusted resolver only after these checks; retain B4 mode disabled.

**Metadata anomalies:** none in these two exports. This does not prove security.
