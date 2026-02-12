# InsightEngine — kompletna lista funkcji, feature'ów i pomysłów

## 1) Fundament produktu (architektura i tryb pracy)
1. Local-first desktop app (Electron) do analityki YouTube.
2. Lokalna baza SQLite jako główne źródło danych.
3. Deterministyczny pipeline analityczny/ML.
4. Działanie offline po wykonaniu synchronizacji.
5. Przenośny build (portable executable).
6. Prywatność: lokalne przechowywanie tokenów/konfiguracji.
7. Monorepo z wydzielonymi paczkami (`core`, `api`, `ml`, `llm`, `reports`, `shared`).
8. Single-instance lock aplikacji desktopowej.
9. Rozdzielenie renderer/main/preload i IPC z walidacją payloadów.

## 2) Tryby pracy danych / API
10. Fake mode (fixture-based, bez kluczy API).
11. Real mode (YouTube API).
12. Record mode (proxy real requestów + zapis fixture’ów).
13. Cache requestów API.
14. Rate limiting warstwy API.
15. Inicjalizacja providera API zależna od env (`APP_PROVIDER`, `RECORD_FIXTURES`).

## 3) Uwierzytelnianie i profil użytkownika
16. Google OAuth connect/disconnect/status.
17. Wyświetlanie statusu zalogowanego użytkownika (avatar/nazwa).
18. Multi-profile (wiele profili kanałów w aplikacji).
19. Tworzenie nowego profilu z nazwą i channel ID.
20. Przełączanie aktywnego profilu i przeładowanie kontekstu.
21. Trwałość aktywnego profilu po stronie DB.

## 4) Sync i orkiestracja danych
22. Orkiestrator synchronizacji z etapami i postępem procentowym.
23. Stage: sync profilu kanału.
24. Stage: sync metadanych filmów.
25. Stage: sync metryk kanału (daily).
26. Stage: sync metryk filmów (daily).
27. Stage: advanced analytics (nowcast + quality).
28. Stage: sync konkurencji.
29. Stage: uruchamianie pluginów insight/alert.
30. Checkpointy synchronizacji zapisywane w meta.
31. Blokada równoległego sync (`Sync already running`).
32. Snapshot run + snapshot items (historyczność wsadów danych).
33. Logi statusu i czasu ostatniego sync.
34. Emisja progress eventów do UI przez IPC (`sync:progress`).

## 5) Raportowanie i dashboard główny
35. Wybór zakresu dat presetami (7d/28d/90d/365d).
36. Przełączanie trybu raportu (FAST/STANDARD/MAX).
37. Główny CTA „Generuj Raport”.
38. Pipeline generowania: sync -> report generate -> pobranie danych -> metryki -> insight.
39. Raport z unikalnym ID i timestampem.
40. KPI cards: total, average, trend, volatility.
41. Wykres timeseries (AreaChart).
42. Sekcja insightów AI (poza FAST).
43. Sanitizacja HTML insightów przed renderem.
44. Obsługa błędu raportu w UI.
45. Mobilny sticky action bar (start/progress).
46. Otwarcie wygenerowanego PDF po stronie systemu.

## 6) Raport PDF/HTML i eksporty
47. Generowanie raportu HTML.
48. Render PDF przez ukryte BrowserWindow (`printToPDF`).
49. Porównanie bieżącego okresu do poprzedniego okresu.
50. Detekcja anomalii w metrykach raportowych.
51. Opcjonalny executive brief AI (w wyższym trybie, gdy API key istnieje).
52. Weekly export package (katalog z timestampem).
53. Pakiet zawiera: `report_max.pdf`.
54. Pakiet zawiera: `top_videos.csv`.
55. Pakiet zawiera: `summary.txt` (alerty + top videos).
56. Historia eksportów zapisywana w DB.
57. Otwieranie katalogu/artefaktu eksportu z poziomu aplikacji.

## 7) Wyszukiwanie i enrichment treści
58. Full-text search po tytułach i transkrypcjach.
59. Snippety wyników z bezpiecznym HTML sanitization.
60. Wyliczanie timestampu dopasowania snippetu do segmentów transkryptu.
61. Zapis transkryptu przez IPC.
62. Obsługa formatów transkryptu w storage.
63. Pobieranie szczegółów video: chapters + retention.
64. Parsowanie SRT do segmentów.

## 8) Import danych
65. Import CSV z UI (upload pliku).
66. Domyślne mapowanie kolumn (date/videoId/metric).
67. Walidacja payloadu importu.
68. Parsowanie CSV po stronie core.
69. Upsert danych dziennych video do bazy.
70. Log importu (status + liczba przetworzonych wierszy).
71. Feedback statusu importu (success/error + licznik).

## 9) Asystent AI i LLM runtime
72. Panel czatu AI (assistant side panel).
73. Historia wiadomości user/assistant.
74. Wysyłka pytań do backendu LLM przez IPC.
75. Obsługa evidence source w odpowiedziach.
76. Loading state („Analizuję dane…”).
77. Fallback komunikatu błędu przy nieudanym zapytaniu.
78. Ustawienia LLM w UI: provider.
79. Ustawienia LLM w UI: model.
80. Ustawienia LLM w UI: temperature.
81. Ustawienia LLM w UI: max output tokens.
82. Automatyczny autosave ustawień LLM.
83. Trwałość ustawień LLM per profil.
84. Walidacja konfiguracji LLM (np. brak modelu).
85. Walidacja kluczy API pod wybrany provider w real mode.
86. Fake-mode LLM odpowiedzi deterministyczne.
87. Provider registry z fallback providerem (LocalStub).
88. Konfigurowalny plannerModel/summarizerModel.
89. Limit długości pytania użytkownika.

## 10) Orkiestrator LLM (feature merytoryczny)
90. Dwuetapowy flow: planner -> data executor -> summarizer.
91. Plan zapytania w JSON (`QueryPlan`).
92. Rozróżnienie intencji `general_knowledge` vs zapytania do danych.
93. Wykonanie planu na danych lokalnych (CoreDataExecutor).
94. Dołączanie evidence do odpowiedzi asystenta.
95. Truncation kontekstu danych przy dużych payloadach.
96. Osobne prompty systemowe dla planera i summarizera.

## 11) Guardrails i bezpieczeństwo LLM
97. Guarded provider z dziennymi limitami tokenów.
98. Guarded provider z limitem kosztu dziennego.
99. Redakcja danych wrażliwych (np. email, card-like pattern).
100. Cache odpowiedzi LLM po hashu promptu.
101. Tracking usage/cost do tabeli usage.

## 12) ML/forecasting/nowcast
102. Lokalne trenowanie modeli forecastingu.
103. Model registry (lista modeli + status active).
104. Backtesting na rolling windows.
105. Metryki jakości modeli: sMAPE, MAE.
106. Quality gate wyboru modelu aktywnego.
107. Forecast modele: naive, seasonal naive, v2 hybrid.
108. Deterministyczny RNG dla algorytmów.
109. Jawne sortowanie danych dla reprodukowalności.
110. Nowcast: growth curve matching.
111. Krzywe percentylowe wzrostu (p25/p50/p75).
112. Persist `video_growth_curves`.
113. Trigger trenowania modeli z UI.

## 13) Quality scoring i analizy video
114. Dynamiczne benchmarki jakości (percentyle kanału).
115. Składowe quality: velocity, efficiency, conversion.
116. Dodatkowa składowa consistency (CV dziennych views).
117. Sigmoid normalization wyników składowych.
118. Weighted final score quality.
119. Persist `video_quality_scores`.
120. Quality ranking (widok tabelaryczny).

## 14) Competitor intelligence
121. Tabele konkurencji (kanały, video, snapshoty dzienne).
122. Sync publicznych video konkurencji.
123. Snapshot dziennego view_count konkurencji.
124. Wyliczanie momentum konkurencji per video/day.
125. Detekcja hitów (próg percentylowy + minimalny wolumen).
126. Velocity 24h i 7d.
127. Acceleration trend (accelerating/decelerating/stable).
128. Sustained momentum (ciągłość >1.5x avg przez N dni).
129. Widok „Radar Konkurencji” (UI).

## 15) Topic intelligence
130. Topic clustering (K-Means, TF-IDF).
131. Topic cluster membership.
132. Gap scoring klastrów.
133. Topic pressure day.
134. Gap reason (opis dominacji konkurencji).
135. Widok klastrów tematycznych (UI).

## 16) Planning system (backlog + kalendarz)
136. Backlog pomysłów (lista + dodawanie).
137. Scoring pomysłu (momentum + effort).
138. Explain JSON dla score pomysłu.
139. Kalendarz publikacji (content plan).
140. Dodawanie planu publikacji.
141. Check ryzyka powtórki tytułu (similarity).
142. Risk score + risk reason zwracane przy dodaniu planu.
143. Ostrzeżenie „Ryzyko powtórki” w UI.

## 17) System insightów i alertów (pluginy)
144. Plugin manager rejestrujący pluginy insight/alert.
145. Uruchamianie wszystkich pluginów po sync.
146. Persist insightów do tabeli insights.
147. TopMovers plugin.
148. Bottleneck plugin (CTR bottleneck).
149. SourceShift plugin (stub).
150. AnomalyDays plugin.
151. Sleepers plugin.
152. QualityRanking plugin (heurystyczny V1).
153. CtrDrop alert plugin.
154. CompetitorGapHit alert plugin.
155. Playbook action JSON dla alertów.
156. Widok alertów i playbooków w UI.

## 18) Diagnostyka, observability, recovery
157. Perf events i pomiar czasu kluczowych etapów.
158. Diagnostics modal z listą eventów i duration.
159. DB integrity check z UI.
160. Safe mode overlay dla błędów krytycznych.
161. Recovery actions: vacuum.
162. Recovery actions: reindex.
163. Recovery actions: reset cache.
164. Ustandaryzowany `AppError` i mapowanie błędów IPC.
165. Logowanie ścieżek i błędów startu.

## 19) Schemat danych (wysoki poziom domen)
166. Core star schema (`dim_channel`, `dim_video`, `fact_channel_day`, `fact_video_day`).
167. Competitor schema (`competitor_*`).
168. Topic/ML schema (`topic_*`, `ml_models`, `video_growth_curves`, `video_quality_scores`).
169. Operational schema (`app_meta`, `sync_runs`, `perf_events`, `alerts`, `profiles`, `llm_cache`, `llm_usage`).
170. Content enrichment schema (`video_transcripts`, `videos_fts`, `video_chapters`, `video_retention`, `video_notes`, `thumbnail_assets`).
171. Planning schema (`ideas`, `idea_scores`, `content_plan`).

## 20) Funkcje UI, które dziś są w trybie mock/WIP (ale są dobrymi pomysłami)
172. CoverageView — obecnie symulowane pokrycie danych.
173. CompetitorView — demo/mock listy hitów.
174. TopicClustersView — mock danych klastrów i gapów.
175. AlertsView — mock unread alertów.
176. QualityRankingView — mock scoreboard w UI.
177. Placeholder wykres wzrostu konkurencji (WIP).

## 21) Meta-pomysły produktowe wynikające z obecnej aplikacji
178. „One-click weekly package” jako standard raportowania dla zespołu/klienta.
179. „Insight-to-action” (alert + playbook) zamiast samych wykresów.
180. „Human + AI copilot” z evidence grounding.
181. „Offline analytics workstation” dla twórców i agency ops.
182. „Deterministic ML in local app” jako przewaga audytowalności.
183. „Plugin marketplace” pod własne insighty/alerty.
184. „Profile-based strategy labs” dla wielu kanałów/brandów.
185. „Topic gap offense system” (konkurencja -> luka -> pomysł -> plan publikacji).
186. „Retention-aware content editor” (chapters + drop points -> rekomendacje skryptu).
187. „Automated post-mortem raportów” po każdym sync (anomalie + root-cause hints).
188. „Model drift watch” i automatyczne retraining suggestions.
189. „Risk-aware calendar” (powtórki tematów, kanibalizacja, seasonality windows).
190. „Reusable fixture recorder” jako narzędzie QA dla zespołów data/ML.
