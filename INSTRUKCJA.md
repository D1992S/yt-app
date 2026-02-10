# Instrukcja instalacji i uruchomienia InsightEngine Desktop

## Dla kogo jest ta instrukcja?

Ta instrukcja jest napisana **dla osob, ktore nigdy nie programowaly** i nie wiedzą co to terminal, Node.js ani Git. Wszystko jest wytłumaczone krok po kroku. Jeśli coś jest niejasne — czytaj dalej, każdy krok ma wyjaśnienie.

---

## Spis treści

1. [Co to w ogóle jest ta aplikacja?](#1-co-to-w-ogole-jest-ta-aplikacja)
2. [Słowniczek pojęć](#2-slowniczek-pojec)
3. [Co musisz zainstalować na komputerze](#3-co-musisz-zainstalowac-na-komputerze)
   - [Krok 1: Git](#krok-1-git---system-kontroli-wersji)
   - [Krok 2: Node.js](#krok-2-nodejs---srodowisko-uruchomieniowe)
   - [Krok 3: pnpm](#krok-3-pnpm---menadzer-pakietow)
4. [Pobranie projektu z GitHub](#4-pobranie-projektu-z-github)
5. [Instalacja zależności projektu](#5-instalacja-zaleznosci-projektu)
6. [Konfiguracja pliku .env.local](#6-konfiguracja-pliku-envlocal)
7. [Uruchomienie aplikacji](#7-uruchomienie-aplikacji)
8. [Jak sprawdzić czy działa](#8-jak-sprawdzic-czy-dziala)
9. [Zbudowanie gotowej aplikacji (.exe)](#9-zbudowanie-gotowej-aplikacji-exe)
10. [Najczęstsze problemy i rozwiązania](#10-najczestsze-problemy-i-rozwiazania)
11. [Tryby pracy aplikacji](#11-tryby-pracy-aplikacji)
12. [Testy](#12-testy)

---

## 1. Co to w ogóle jest ta aplikacja?

**InsightEngine Desktop** to program na komputer (Windows, Mac, Linux), który:

- Pobiera dane z **YouTube Analytics** (statystyki Twojego kanału na YouTube)
- Przechowuje je **lokalnie na Twoim komputerze** (w bazie danych SQLite)
- Generuje **raporty** z tych danych
- Opcjonalnie używa **sztucznej inteligencji** (ChatGPT, Gemini) do analizy danych

Ważne: aplikacja działa **na Twoim komputerze**, nie w przeglądarce. To program desktopowy zbudowany w technologii Electron (tak jak np. Visual Studio Code, Discord czy Slack).

---

## 2. Słowniczek pojęć

Zanim zaczniemy — oto wyjaśnienia pojęć, które będą się pojawiać:

| Pojęcie | Co to jest? |
|---------|-------------|
| **Terminal / Wiersz poleceń** | Czarne okienko, w którym wpisujesz komendy tekstowe. Na Windows to **PowerShell** lub **Wiersz polecenia (cmd)**. Na Mac to **Terminal**. Zamiast klikać w ikonki — wpisujesz polecenia z klawiatury. |
| **Git** | Program do śledzenia zmian w kodzie. Pozwala pobrać projekt z internetu (z GitHub) jedną komendą. Coś jak "historia wersji" w Google Docs, ale dla kodu. |
| **GitHub** | Strona internetowa (github.com), na której ludzie przechowują swoje projekty programistyczne. Tam znajduje się kod tej aplikacji. |
| **Repozytorium (repo)** | Folder z projektem przechowywany na GitHub. Zawiera cały kod, konfigurację i historię zmian. |
| **Node.js** | Program, który pozwala uruchamiać kod JavaScript poza przeglądarką. Nasza aplikacja jest napisana w JavaScript/TypeScript i potrzebuje Node.js do działania. Pomyśl o tym jak o "silniku", który napędza aplikację. |
| **npm** | Menadżer pakietów dostarczany razem z Node.js. Służy do pobierania bibliotek (gotowych kawałków kodu napisanych przez innych). Instaluje się automatycznie razem z Node.js. |
| **pnpm** | Szybsza i bardziej wydajna alternatywa dla npm. Nasz projekt używa pnpm zamiast npm. Musisz go doinstalować osobno (instrukcja poniżej). |
| **Zależności (dependencies)** | Biblioteki i narzędzia, których potrzebuje nasza aplikacja do działania. Np. React (do interfejsu), SQLite (do bazy danych), itp. Komenda `pnpm install` pobiera je wszystkie automatycznie. |
| **Plik .env** | Plik z ustawieniami/hasłami, który NIE jest wysyłany na GitHub (bo zawiera prywatne dane jak klucze API). Tworzysz go lokalnie na swoim komputerze. |
| **Klucz API (API Key)** | Hasło/token, które pozwala Twojej aplikacji łączyć się z zewnętrznymi usługami (np. OpenAI, Google). Każdy ma swój własny klucz. |
| **LLM** | Large Language Model — duży model językowy, czyli sztuczna inteligencja typu ChatGPT lub Gemini. Aplikacja może ich używać do analizy danych. |
| **Electron** | Technologia pozwalająca tworzyć programy desktopowe używając technologii webowych (HTML, CSS, JavaScript). Dzięki temu ta aplikacja działa na Windows, Mac i Linux. |
| **SQLite** | Lekka baza danych przechowywana w jednym pliku na Twoim komputerze. Nie wymaga instalacji osobnego serwera bazy danych. |
| **TypeScript** | Rozszerzenie języka JavaScript, które dodaje sprawdzanie typów (pomaga unikać błędów). Nasz projekt jest napisany w TypeScript. |
| **Monorepo** | Sposób organizacji projektu, w którym kilka powiązanych paczek/modułów żyje w jednym repozytorium. Nasz projekt ma folder `packages/` z wieloma modułami i `apps/` z aplikacją desktopową. |

---

## 3. Co musisz zainstalować na komputerze

Musisz zainstalować **3 rzeczy** (w tej kolejności):

1. **Git** — do pobrania projektu
2. **Node.js** — do uruchomienia aplikacji
3. **pnpm** — do zarządzania zależnościami

---

### Krok 1: Git - system kontroli wersji

#### Co to jest Git i po co mi to?

Git to program, który pozwala pobrać projekt z GitHub na Twój komputer. Bez niego musiałbyś ręcznie pobierać ZIP-a — a z Gitem wystarczy jedna komenda.

#### Instalacja na Windows

1. Wejdź na stronę: **https://git-scm.com/download/win**
2. Pobieranie powinno zacząć się automatycznie. Jeśli nie — kliknij link do pobrania
3. Uruchom pobrany plik instalacyjny (np. `Git-2.xx.x-64-bit.exe`)
4. **Podczas instalacji**: klikaj **Next** na każdym ekranie — domyślne ustawienia są OK
5. Na ekranie "Adjusting your PATH environment" upewnij się, że zaznaczona jest opcja **"Git from the command line and also from 3rd-party software"** (powinna być domyślnie)
6. Kliknij **Install**, poczekaj, kliknij **Finish**

#### Instalacja na macOS

1. Otwórz **Terminal** (Spotlight → wpisz "Terminal" → Enter)
2. Wpisz:
   ```bash
   git --version
   ```
3. Jeśli Git nie jest zainstalowany, system zaproponuje instalację narzędzi deweloperskich — zaakceptuj
4. Alternatywnie wejdź na: **https://git-scm.com/download/mac**

#### Instalacja na Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install git
```

#### Sprawdzenie czy Git jest zainstalowany

Otwórz terminal i wpisz:
```bash
git --version
```

Powinno wyświetlić coś takiego:
```
git version 2.43.0
```

Jeśli widzisz numer wersji — Git jest zainstalowany poprawnie.

---

### Krok 2: Node.js - środowisko uruchomieniowe

#### Co to jest Node.js i po co mi to?

Node.js to "silnik" do uruchamiania kodu JavaScript. Nasza aplikacja jest napisana w JavaScript/TypeScript i bez Node.js nie da się jej uruchomić. Razem z Node.js instaluje się też **npm** (menadżer pakietów).

#### Instalacja na Windows

1. Wejdź na stronę: **https://nodejs.org**
2. Zobaczysz dwa przyciski do pobrania. Kliknij ten z napisem **LTS** (Long Term Support — wersja stabilna)
   - Potrzebujesz wersji **18 lub nowszej** (zalecana **20 LTS** lub **22 LTS**)
3. Uruchom pobrany plik instalacyjny (np. `node-v20.xx.x-x64.msi`)
4. Klikaj **Next** na każdym ekranie
5. Na ekranie z checkboxami upewnij się, że zaznaczone jest **"Add to PATH"** (powinno być domyślnie)
6. Kliknij **Install**, poczekaj, kliknij **Finish**
7. **WAŻNE: Zamknij i otwórz ponownie PowerShell** (żeby nowe ścieżki się załadowały)

#### Instalacja na macOS

1. Wejdź na: **https://nodejs.org**
2. Pobierz wersję **LTS**
3. Uruchom pobrany plik `.pkg` i postępuj zgodnie z instrukcjami
4. Zamknij i otwórz ponownie Terminal

#### Instalacja na Linux (Ubuntu/Debian)

```bash
# Dodaj repozytorium NodeSource (Node.js 20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Zainstaluj Node.js
sudo apt install -y nodejs
```

#### Sprawdzenie czy Node.js jest zainstalowany

Otwórz **nowe okno** terminala (to ważne!) i wpisz:

```bash
node -v
```

Powinno wyświetlić coś takiego:
```
v20.11.0
```

Sprawdź też npm:
```bash
npm -v
```

Powinno wyświetlić:
```
10.2.4
```

Jeśli oba polecenia zwracają numery wersji — wszystko jest OK.

**Jeśli `node` nie jest rozpoznawane** — zamknij terminal i otwórz go ponownie. Jeśli nadal nie działa — zrestartuj komputer.

---

### Krok 3: pnpm - menadżer pakietów

#### Co to jest pnpm i po co mi to?

**pnpm** to menadżer pakietów (jak npm, ale szybszy i lepiej zarządza miejscem na dysku). Nasz projekt wymaga pnpm w wersji 9 lub nowszej. Używamy go zamiast npm, bo projekt jest typu "monorepo" (wiele paczek w jednym repozytorium) i pnpm obsługuje to lepiej.

#### Instalacja (ta sama na każdym systemie)

Otwórz terminal i wpisz:

```bash
npm install -g pnpm
```

Co oznacza ta komenda?
- `npm` — używasz npm (który zainstalował się z Node.js)
- `install` — instalujesz coś
- `-g` — globalnie (dostępne z każdego folderu, nie tylko z bieżącego)
- `pnpm` — nazwa pakietu, który instalujesz

#### Sprawdzenie czy pnpm jest zainstalowany

```bash
pnpm -v
```

Powinno wyświetlić:
```
9.x.x
```

Wersja musi być **9.0.0 lub wyższa**. Jeśli masz starszą wersję, zaktualizuj:
```bash
npm install -g pnpm@latest
```

---

## 4. Pobranie projektu z GitHub

Teraz pobierasz kod projektu na swój komputer.

### Sposób 1: Za pomocą Git (zalecany)

1. Otwórz terminal
2. Przejdź do folderu, w którym chcesz trzymać projekt. Na przykład:
   ```bash
   # Windows (PowerShell)
   cd C:\Users\TwojeImie\Documents

   # macOS / Linux
   cd ~/Documents
   ```
3. Pobierz projekt:
   ```bash
   git clone https://github.com/D1992S/yt-app.git
   ```
4. Wejdź do folderu projektu:
   ```bash
   cd yt-app
   ```

### Sposób 2: Pobranie ZIP-a (jeśli nie masz Git)

1. Wejdź w przeglądarce na stronę repozytorium na GitHub
2. Kliknij zielony przycisk **"Code"**
3. Kliknij **"Download ZIP"**
4. Rozpakuj pobrany plik ZIP
5. Otwórz terminal i przejdź do rozpakowanego folderu:
   ```bash
   # Windows (PowerShell) — ścieżka zależy od tego, gdzie rozpakowałeś
   cd C:\Users\TwojeImie\Downloads\yt-app-main

   # macOS / Linux
   cd ~/Downloads/yt-app-main
   ```

### Jak otworzyć terminal w odpowiednim folderze?

**Windows:**
- Otwórz Eksplorator plików
- Przejdź do folderu `yt-app`
- Kliknij w pasek adresu u góry (gdzie jest ścieżka)
- Wpisz `powershell` i naciśnij **Enter**
- Otworzy się PowerShell w tym folderze

**macOS:**
- Otwórz Finder
- Przejdź do folderu `yt-app`
- Kliknij prawym przyciskiem → "Nowy terminal w folderze"
- (Jeśli nie widzisz tej opcji: System Preferences → Keyboard → Shortcuts → Services → zaznacz "New Terminal at Folder")

---

## 5. Instalacja zależności projektu

Teraz jesteś w folderze projektu (np. `yt-app`). Musisz pobrać wszystkie biblioteki, których aplikacja potrzebuje do działania.

**Upewnij się, że jesteś w głównym folderze projektu!** Możesz to sprawdzić:
```bash
# Pokaż bieżący folder
pwd

# Na Windows (PowerShell)
Get-Location
```

Powinno pokazać ścieżkę kończącą się na `yt-app` (lub `yt-app-main` jeśli pobierałeś ZIP-a).

Teraz wpisz:

```bash
pnpm install
```

**Co się teraz dzieje?**
- pnpm czyta plik `package.json` i `pnpm-lock.yaml`
- Pobiera wszystkie wymagane biblioteki z internetu
- Instaluje je w folderze `node_modules`
- Może to potrwać kilka minut — to normalne
- Na końcu powinno wyświetlić podsumowanie bez błędów (czerwonego tekstu)

**Jeśli zobaczysz ostrzeżenia (warnings) w żółtym kolorze** — to jest OK, ostrzeżenia można zignorować. Ważne, żeby nie było **błędów (errors)** w czerwonym kolorze.

---

## 6. Konfiguracja pliku .env.local

#### Co to jest plik .env.local?

To plik z Twoimi **prywatnymi ustawieniami** — kluczami API, portami itp. **Nie jest wysyłany na GitHub** (jest w `.gitignore`), więc Twoje hasła są bezpieczne.

#### Tworzenie pliku .env.local

W głównym folderze projektu jest plik `.env.example` — to szablon. Skopiuj go:

**Windows (PowerShell):**
```bash
Copy-Item .env.example .env.local
```

**macOS / Linux:**
```bash
cp .env.example .env.local
```

#### Edycja pliku .env.local

Otwórz plik `.env.local` w dowolnym edytorze tekstowym:

- **Windows**: kliknij prawym na plik → "Otwórz za pomocą" → Notatnik
- **macOS**: otwórz w TextEdit lub dowolnym edytorze
- Jeśli masz **Visual Studio Code**: `code .env.local`

#### Co ustawić w pliku?

```env
# === TRYB PRACY ===
# "fake" = tryb testowy, nie potrzebujesz kluczy API (domyślny)
# "real" = łączy się z prawdziwym YouTube API
APP_PROVIDER=fake

# === KLUCZE API (tylko dla trybu "real" lub funkcji AI) ===
# Klucz do OpenAI (ChatGPT) — opcjonalny
# Zdobędziesz go na: https://platform.openai.com/api-keys
OPENAI_API_KEY=

# Klucz do Google Gemini — opcjonalny
# Zdobędziesz go na: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=

# === SERWER BACKENDOWY ===
# Te ustawienia możesz zostawić domyślne
API_BACKEND_PORT=5000
API_BACKEND_HOST=127.0.0.1
API_BACKEND_MAX_SIZE=7mb
```

#### Dla początkujących — zacznij od trybu "fake"

Jeśli chcesz tylko zobaczyć jak aplikacja działa, **nie musisz mieć żadnych kluczy API**. Zostaw `APP_PROVIDER=fake` — aplikacja będzie używać przykładowych danych.

#### Jak zdobyć klucze API? (opcjonalne, na później)

**Klucz OpenAI (do ChatGPT):**
1. Wejdź na: https://platform.openai.com/signup
2. Załóż konto (potrzebny email + numer telefonu)
3. Wejdź w: https://platform.openai.com/api-keys
4. Kliknij "Create new secret key"
5. Skopiuj klucz (zaczyna się od `sk-...`) i wklej do `.env.local`
6. **Uwaga**: OpenAI API jest płatne (ale tanie — kilka centów za zapytanie)

**Klucz Google Gemini:**
1. Wejdź na: https://aistudio.google.com/app/apikey
2. Zaloguj się kontem Google
3. Kliknij "Create API Key"
4. Skopiuj klucz i wklej do `.env.local`
5. **Uwaga**: Gemini ma darmowy limit zapytań

---

## 7. Uruchomienie aplikacji

Upewnij się, że jesteś w głównym folderze projektu (`yt-app`).

### Tryb developerski (zalecany na start)

```bash
pnpm dev
```

**Co się dzieje:**
- Uruchamia się serwer backendowy (Express na porcie 5000)
- Uruchamia się aplikacja Electron (okno programu)
- Aplikacja automatycznie się odświeża gdy zmienisz kod
- W terminalu zobaczysz logi (informacje o tym, co robi aplikacja)

### Tryb normalny (produkcyjny)

```bash
pnpm start
```

Uruchamia serwer bez automatycznego odświeżania.

### Jak zatrzymać aplikację?

W terminalu, w którym uruchomiłeś aplikację, naciśnij:

```
Ctrl + C
```

(Na Mac też `Ctrl + C`, nie `Cmd + C`)

Może poprosić o potwierdzenie — wpisz `Y` i naciśnij Enter.

---

## 8. Jak sprawdzić czy działa

### Aplikacja desktopowa

Po uruchomieniu `pnpm dev` powinno otworzyć się **okno aplikacji** (program Electron). Jeśli widzisz interfejs z wykresami/danymi — działa.

### Serwer backendowy

Otwórz **drugie okno terminala** (nie zamykaj pierwszego!) i wpisz:

**Windows (PowerShell):**
```bash
Invoke-WebRequest -Uri http://127.0.0.1:5000/api/settings/llm -UseBasicParsing | Select-Object -ExpandProperty Content
```

**macOS / Linux:**
```bash
curl http://127.0.0.1:5000/api/settings/llm
```

Jeśli dostaniesz odpowiedź JSON (tekst w nawiasach klamrowych `{...}`) — serwer działa.

---

## 9. Zbudowanie gotowej aplikacji (.exe)

Jeśli chcesz zbudować gotowy plik wykonywalny (np. `.exe` na Windows), który możesz uruchomić bez terminala:

### Wersja przenośna (portable — jeden plik .exe)

```bash
pnpm build:portable
```

Gotowy plik znajdziesz w folderze `dist/`.

### Wersja z instalatorem (Windows)

```bash
pnpm --filter @insight/desktop build:win
```

Pliki instalacyjne znajdziesz w `apps/desktop/release/`.

---

## 10. Najczęstsze problemy i rozwiązania

### `pnpm: command not found` / `pnpm nie jest rozpoznawany`

**Przyczyna**: pnpm nie jest zainstalowany lub terminal nie widzi go w PATH.

**Rozwiązanie:**
```bash
npm install -g pnpm
```

Jeśli nadal nie działa — zamknij terminal i otwórz go ponownie (lub zrestartuj komputer).

---

### `node: command not found` / `node nie jest rozpoznawany`

**Przyczyna**: Node.js nie jest zainstalowany lub nie jest dodany do PATH.

**Rozwiązanie:**
1. Zainstaluj Node.js ponownie z https://nodejs.org (wersja LTS)
2. Podczas instalacji upewnij się, że "Add to PATH" jest zaznaczone
3. **Zrestartuj komputer**

---

### Błędy podczas `pnpm install`

#### Błąd `403 Forbidden`

**Przyczyna**: Problem z rejestrem npm lub siecią.

**Rozwiązanie:**
```bash
pnpm config set registry https://registry.npmjs.org/
pnpm install
```

#### Błędy kompilacji natywnych modułów (better-sqlite3)

**Przyczyna**: Na Windows potrzebne są narzędzia do kompilacji C++.

**Rozwiązanie (Windows):**
```bash
# Zainstaluj narzędzia do budowania
npm install -g windows-build-tools

# Lub zainstaluj Visual Studio Build Tools ze strony:
# https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Zaznacz "Desktop development with C++"
```

Po instalacji uruchom ponownie:
```bash
pnpm install
```

---

### Brak odpowiedzi od modelu AI / błąd autoryzacji

**Przyczyna**: Niepoprawny lub brakujący klucz API w `.env.local`.

**Rozwiązanie:**
1. Otwórz `.env.local`
2. Sprawdź czy `OPENAI_API_KEY` lub `GEMINI_API_KEY` jest poprawnie ustawiony
3. Upewnij się, że nie ma dodatkowych spacji przed/po kluczu
4. Zrestartuj aplikację (`Ctrl+C`, potem `pnpm dev`)

---

### Port 5000 jest zajęty

**Przyczyna**: Inny program używa portu 5000.

**Rozwiązanie:**

Zmień port w `.env.local`:
```env
API_BACKEND_PORT=5001
```

Albo znajdź co blokuje port:

**Windows:**
```bash
netstat -ano | findstr :5000
```

**macOS / Linux:**
```bash
lsof -i :5000
```

---

### Aplikacja Electron się nie otwiera

**Przyczyna**: Może brakować zależności systemowych (szczególnie na Linux).

**Rozwiązanie (Linux):**
```bash
sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libsecret-1-0
```

**Windows/macOS**: Upewnij się, że `pnpm install` zakończyło się bez błędów.

---

## 11. Tryby pracy aplikacji

Aplikacja ma trzy tryby pracy:

### Tryb Fake (domyślny) — do testowania

```bash
pnpm dev
```

- Używa **przykładowych danych** z plików JSON (folder `packages/api/fixtures`)
- **Nie potrzebujesz żadnych kluczy API**
- Idealny, żeby zobaczyć jak aplikacja wygląda i działa

### Tryb Real — z prawdziwymi danymi YouTube

```bash
APP_PROVIDER=real pnpm dev
```

Na Windows (PowerShell):
```bash
$env:APP_PROVIDER="real"; pnpm dev
```

- Łączy się z **prawdziwym YouTube API**
- Wymaga ustawienia `GOOGLE_CLIENT_ID` i `GOOGLE_CLIENT_SECRET` w `.env.local`
- Potrzebujesz projektu w Google Cloud Console

### Tryb Record — nagrywanie danych

```bash
APP_PROVIDER=real RECORD_FIXTURES=1 pnpm dev
```

- Pobiera prawdziwe dane z YouTube i **zapisuje je jako pliki JSON**
- Przydatne do tworzenia danych testowych

---

## 12. Testy

Jeśli chcesz sprawdzić, czy kod jest poprawny:

```bash
# Wszystkie testy
pnpm test

# Testy architektury (czy moduły nie łamią granic)
pnpm test:arch

# Testy bazy danych
pnpm test:db

# Testy synchronizacji danych
pnpm test:sync

# Pełny test integracyjny
pnpm smoke
```

---

## Podsumowanie — szybka ściągawka

| Co chcesz zrobić? | Komenda |
|-------------------|---------|
| Zainstalować zależności | `pnpm install` |
| Uruchomić w trybie testowym | `pnpm dev` |
| Uruchomić w trybie produkcyjnym | `pnpm start` |
| Uruchomić testy | `pnpm test` |
| Zbudować .exe (portable) | `pnpm build:portable` |
| Zatrzymać aplikację | `Ctrl + C` w terminalu |

---

## Struktura projektu — co jest gdzie?

```
yt-app/
├── apps/
│   └── desktop/              ← Aplikacja Electron (okno programu)
│       └── src/
│           ├── main/         ← Logika aplikacji desktopowej
│           └── renderer/     ← Interfejs użytkownika (React)
├── packages/
│   ├── api/                  ← Komunikacja z YouTube API
│   ├── core/                 ← Baza danych SQLite, migracje
│   ├── llm/                  ← Integracja z AI (OpenAI, Gemini)
│   ├── ml/                   ← Algorytmy analizy danych
│   ├── reports/              ← Generowanie raportów
│   └── shared/               ← Wspólne typy i schematy
├── components/               ← Komponenty React
├── server.js                 ← Serwer backendowy (Express)
├── package.json              ← Główna konfiguracja projektu
├── .env.example              ← Szablon pliku z ustawieniami
├── .env.local                ← Twoje prywatne ustawienia (tworzysz sam)
└── INSTRUKCJA.md             ← Ten plik :)
```

---

## Potrzebujesz pomocy?

Jeśli masz problem, którego nie ma w tej instrukcji:

1. Sprawdź zakładkę **Issues** w repozytorium na GitHub
2. Utwórz nowy Issue opisując:
   - Jaki masz system (Windows/Mac/Linux)
   - Co wpisałeś w terminalu
   - Jaki błąd dostałeś (skopiuj cały tekst błędu)
   - Co próbowałeś zrobić, żeby to naprawić
