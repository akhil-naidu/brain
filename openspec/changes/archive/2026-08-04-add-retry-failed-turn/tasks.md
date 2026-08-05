## 1. Error toast

- [x] 1.1 Extend `ErrorToast` with optional Retry action (`onRetry`)
- [x] 1.2 Keep dismiss behavior unchanged

## 2. Agent chat wiring

- [x] 2.1 Derive retryable user prompt text from the thread + error state
- [x] 2.2 Wire Retry to the existing submit/send path with busy/API-key gates
- [x] 2.3 Keep draft restore for failed user messages

## 3. Tests & verify

- [x] 3.1 Add/adjust tests for Retry visibility and send invocation
- [x] 3.2 Run verify clean
