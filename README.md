# InsightEngine Desktop

A local-first, deterministic reporting tool for YouTube Analytics.

> **Nie wiesz jak zacząć?** Przeczytaj **[INSTRUKCJA.md](INSTRUKCJA.md)** — szczegółowy poradnik krok po kroku po polsku, napisany dla osób bez doświadczenia z programowaniem.

## Features
- **Local Database**: SQLite storage for all metrics.
- **Offline Ready**: Works without internet after data sync.
- **Portable**: No installation required.
- **Privacy**: Tokens stored locally (encrypted).

## Instalacja i uruchomienie (dla początkujących)

Poniżej masz instrukcję "krok po kroku" tak, żeby aplikacja uruchomiła się bez problemu.

---

### 1) Zainstaluj wymagane narzędzia

Potrzebujesz:
- **Node.js 18+** (najlepiej wersja LTS 20)
- **pnpm**
- (opcjonalnie) **Git**

#### Windows
1. Wejdź na: https://nodejs.org
2. Pobierz wersję **LTS** i zainstaluj (klikaj "Next").
3. Otwórz **PowerShell** i wpisz:
   ```bash
   node -v
   npm -v
   ```
4. Zainstaluj pnpm:
   ```bash
   npm install -g pnpm
   ```
5. Sprawdź:
   ```bash
   pnpm -v
   ```

#### macOS
1. Zainstaluj Node.js LTS ze strony https://nodejs.org (lub przez Homebrew).
2. W Terminalu sprawdź:
   ```bash
   node -v
   npm -v
   ```
3. Zainstaluj pnpm:
   ```bash
   npm install -g pnpm
   pnpm -v
   ```

#### Linux
1. Zainstaluj Node.js 18+ (najlepiej 20 LTS) przez menedżer pakietów lub NodeSource.
2. Sprawdź:
   ```bash
   node -v
   npm -v
   ```
3. Zainstaluj pnpm:
   ```bash
   npm install -g pnpm
   pnpm -v
   ```

---

### 2) Pobierz projekt

Jeśli masz Git:
```bash
git clone <TU_WKLEJ_LINK_DO_REPOZYTORIUM>
cd yt-app
```

Jeśli nie masz Git:
1. Pobierz ZIP z GitHub (Code -> Download ZIP).
2. Rozpakuj.
3. Otwórz terminal w folderze projektu `yt-app`.

---

### 3) Zainstaluj zależności

W folderze projektu uruchom:
```bash
pnpm install
```

To może potrwać kilka minut.

---

### 4) Skonfiguruj plik `.env.local`

W głównym katalogu projektu utwórz plik **`.env.local`**.

Najprościej:
1. Skopiuj plik `.env.example`.
2. Zmień nazwę kopii na `.env.local`.

W pliku ustaw minimum:
```env
OPENAI_API_KEY=...
GEMINI_API_KEY=...
```

Dodatkowo (opcjonalnie):
```env
API_BACKEND_PORT=5000
API_BACKEND_HOST=127.0.0.1
API_PAYLOAD_MAX_SIZE=7mb
```

### 5) Uruchom aplikację

W katalogu projektu:

- Start normalny:
  ```bash
  pnpm start
  ```

- Tryb developerski (auto-restart po zmianach):
  ```bash
  pnpm dev
  ```

### 6) Jak sprawdzić, czy działa

W drugim terminalu możesz sprawdzić, czy port działa:
```bash
curl http://127.0.0.1:5000
```

Jeśli endpoint główny nie istnieje, to i tak ważne jest, że proces serwera działa i nie kończy się błędem.

---

## Najczęstsze problemy i szybkie rozwiązania

### Problem: `pnpm: command not found`
Rozwiązanie: doinstaluj pnpm:
```bash
npm install -g pnpm
```

### Problem: brak odpowiedzi od modelu lub błąd autoryzacji LLM
Rozwiązanie: upewnij się, że w `.env.local` masz poprawnie ustawione `OPENAI_API_KEY` i/lub `GEMINI_API_KEY`.

### Problem: `403` przy `pnpm install`
To zwykle problem sieci/proxy/rejestru npm. Spróbuj:
```bash
pnpm config get registry
pnpm config set registry https://registry.npmjs.org/
pnpm install
```

---

## Development (skrót)

### Prerequisites
- Node.js 18+
- pnpm

### Setup
```bash
pnpm install
```

### Running in Dev Mode (Hot Reload)
```bash
pnpm dev
```

### Testing
- `pnpm test:arch`: Check architecture boundaries.
- `pnpm test:db`: Test database connection and migrations.
- `pnpm test:sync`: Test sync engine with fake data.

## Modes

### Fake Mode (Default)
Uses JSON fixtures from `packages/api/fixtures`. No API keys required.
```bash
APP_PROVIDER=fake pnpm dev
```

### Real Mode
Connects to YouTube API. Requires Google Cloud Console setup.
```bash
APP_PROVIDER=real GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... pnpm dev
```

## Ustawienia providera/modelu w UI

- W aplikacji możesz przełączać provider i model bez restartu.
- Zmiany zapisują się lokalnie na urządzeniu, więc po ponownym uruchomieniu ustawienia pozostają takie same.

### Record Mode
Proxies real requests and saves them as fixtures.
```bash
APP_PROVIDER=real RECORD_FIXTURES=1 pnpm dev
```

## Building Portable App
Creates a portable executable in `dist/`.
```bash
pnpm build:portable
```

## Manualny plan testów (provider/model + restart + błędy)

1. Uruchom aplikację w trybie real: `APP_PROVIDER=real pnpm dev`.
2. Wejdź do panelu ustawień LLM i sprawdź aktualny provider/model.
3. Zmień provider na **OpenAI**, ustaw model (np. `gpt-4o-mini`) i zapisz ustawienia.
4. Wyślij pytanie przez panel asystenta i potwierdź, że odpowiedź wraca bez błędu.
5. Przełącz provider na **Gemini**, ustaw model (np. `gemini-2.5-flash`) i ponownie zapisz.
6. Wyślij kolejne pytanie; zweryfikuj, że odpowiedź działa także po zmianie providera/modelu.
7. Zamknij aplikację całkowicie i uruchom ją ponownie.
8. Otwórz ustawienia LLM i potwierdź, że ostatnio zapisany provider/model zostały zachowane po restarcie.
9. Zasymuluj błąd klucza API (np. usuń `OPENAI_API_KEY` i wybierz OpenAI), potem spróbuj zapytać model — powinien pojawić się błąd walidacji konfiguracji.
10. Uruchom tryb fake (`APP_PROVIDER=fake pnpm dev`) i sprawdź, że odpowiedź asystenta to stub deterministyczny bez użycia kluczy API.
