# Quiz completion hook

Total-Dreamscape mode lets a quiz that was already active when the limit was reached finish before locking.

In each successful quiz-submission handler, dispatch this event immediately after the final answer/attempt has been saved:

```ts
window.dispatchEvent(new Event("dreamscape:quiz-complete"));
```

Do not dispatch it when a quiz is merely opened, paused, or abandoned. A learner who opens a quiz after the daily limit has already been reached is locked immediately.
