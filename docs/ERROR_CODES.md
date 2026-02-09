# Error Codes

The application uses a centralized `AppError` class with specific error codes to handle failures gracefully and provide user-friendly feedback.

| Code | Description | Retryable | User Message |
|------|-------------|-----------|--------------|
| `UNKNOWN_ERROR` | An unexpected error occurred. | No | Wystąpił nieoczekiwany błąd. |
| `NETWORK_ERROR` | Network connection failed (fetch, DNS). | Yes | Problem z połączeniem sieciowym. |
| `AUTH_ERROR` | API Token invalid or expired (401). | No | Błąd autoryzacji. Sprawdź token. |
| `QUOTA_EXCEEDED` | API Rate limit exceeded (429/403). | Yes | Przekroczono limit zapytań API. |
| `DB_LOCKED` | SQLite database is locked by another process. | Yes | Baza danych jest zablokowana. |
| `VALIDATION_ERROR` | Input data failed Zod validation. | No | Błąd walidacji danych. |
| `NOT_FOUND` | Requested resource not found. | No | Nie znaleziono zasobu. |
| `SYNC_FAILED` | General sync failure. | No | Synchronizacja nie powiodła się. |

## Handling in UI
Errors with `isRetryable: true` trigger the **Safe Mode** UI, allowing the user to retry the operation or perform recovery actions (e.g., Vacuum DB).
