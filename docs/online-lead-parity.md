# Online Lead → OnLead: parity backlog

Источник эталона: `post2post/apps/web` (IA из `lib/products.ts`, UI/API по маршрутам).
OnLead: `js/catalog.js`, `js/*-ol.js`, `js/app.js` (shell), `server/routes/*` + domain services.

**Легенда статуса:** ✅ есть · 🟡 частично · ❌ нет · 🔍 нужна сверка UI

---

## 1. Обзор

### 1.1 Главная (`/dashboard`)
| # | Online Lead | OnLead | Статус |
|---|-------------|--------|--------|
| 1 | Статистика каналов и постов | 5 KPI + активность VK | ✅ |
| 2 | Быстрые действия (7 шт) | 7 quick actions | ✅ |
| 3 | Лента активности | График + sidebar neuro/AI | ✅ |
| 4 | Онбординг / empty states | Чеклист 3 шага + промо | ✅ |

**Чеклист реализации**
- [x] Сверить блоки dashboard с OL
- [x] «Подключить аккаунт» / «Создать пост»
- [x] Статистика нейрокомментов на главной
- [x] Единый стиль карточек и quick actions

**Файлы OL:** `app/(app)/dashboard/*`  
**Файлы OnLead:** `js/dashboard-ol.js`, `css/dashboard-ol.css`

---

### 1.3 Тарифы (`/billing`)
| # | Online Lead | OnLead | Статус |
|---|-------------|--------|--------|
| 1 | Start/Pro/Business/Agency | Business / Maxi ИИ / Maxi | ✅ |
| 2 | Add-ons, passive products | Секции ЛГ / AI / поштучно | ✅ |
| 3 | Якоря #leadgen #ai-agents | `#posting-plans` `#leadgen` `#ai-agents` | ✅ |

**Чеклист**
- [x] Структура страницы как OL (секции планов)
- [x] Add-ons каталог
- [x] Usage strip + plan hero

**Файлы OnLead:** `js/billing-ol.js`, `css/billing-ol.css` · кошелёк — `balance()`
| # | Online Lead | OnLead | Статус |
|---|-------------|--------|--------|
| 1 | VK, Telegram, MAX, OK, Дзен, VC.ru | Только VK | 🟡 |
| 2 | Выбор каналов после connect | Сообщества VK | 🟡 |
| 3 | Статус токенов | Базовый + messages token | ✅ |

**Чеклист**
- [x] Сверить UI connect-modal с OL (шаги + платформы, VK активен)
- [x] Мультиплатформа — отложено: продукт VK-only (TG/OK/Дзен — chips «скоро»)
- [x] Слоты / аренда аккаунтов (CTA «Арендовать слот» → тарифы)

**Файлы OL:** `connections/*`, `connect-account-modal.tsx`  
**Файлы OnLead:** `js/accounts-ol.js`, `js/vk-connect-ol.js`, `server/vk/*`

---

### 1.2 Аккаунты (`/accounts`)
| # | Online Lead | OnLead | Статус |
|---|-------------|--------|--------|
| 1 | 5 этапов (+ Отказ) | 5 этапов kanban | ✅ |
| 2 | AI score на карточке | Скоринг на карточке | ✅ |
| 3 | Notes, assignee | Sidebar: заметки + ответственный | ✅ |

**Чеклист**
- [x] Этап «Отказ» / архив как в OL
- [x] Assignee (ответственный)
- [x] PATCH leads API parity

**Файлы OL:** `leadgen/crm/page.tsx`  
**Файлы OnLead:** `js/crm-ol.js`, `server/crm.mjs`

---

### 1.5 AI Лид-менеджер (`/vk-tools/lead-dm`)
| # | Online Lead | OnLead | Статус |
|---|-------------|--------|--------|
| 1 | Сценарий: список/friends/segment | source + listId + userIds | ✅ |
| 2 | Шаблон + AI rewrite toggle | template + useAi + offer | ✅ |
| 3 | Daily limit, actions log | `/api/ai-lead` + журнал | ✅ |
| 4 | Push to CRM | createCrmLead + score | ✅ |

**Чеклист**
- [x] UI как `vk-tools/lead-dm/page.tsx` + `vk-tool-ui.tsx`
- [x] Журнал actions (`GET /api/ai-lead/actions`)
- [x] Run button / статусы run

**Файлы OnLead:** `js/ai-lead-ol.js`, `server/ai-lead-tool.mjs`, `server/vk/ai-lead.mjs`

---

### 1.6 Нейрокомментарии (`/neurocomments`)
| # | Online Lead | OnLead | Статус |
|---|-------------|--------|--------|
| 1 | Tabs: Настройки, Диалоги, Статистика, Блокировки, Обучение | 5 вкладок nc-ol | ✅ |
| 2 | Task filters (запланированы/отправлены/ошибки) | nc-task-filter | ✅ |
| 3 | FAQ / обучение | nc-faq modal | ✅ |

**Чеклист**
- [x] 5 вкладок как в OL
- [x] Блокировки пользователей
- [x] Статистика по задачам
- [x] neurocomments-faq контент

---

## 2. Контент (🟡 MVP в OnLead)

**Маршруты:** `#/office/content`, `#/office/compose`, `#/office/content-studio`, `#/office/media`, `#/office/history`  
**Файлы:** `server/posts.mjs`, `js/content-ol.js`, `js/compose-ol.js`, `css/content-ol.css`

### 2.1 AI-контент под ключ (`/content-studio`)
| # | OL | OnLead | Статус |
|---|-----|--------|--------|
| 1 | Wizard: профиль → ниша → план | Wizard 3 шага + 7/14/30 | ✅ |
| 2 | `lib/business-niches.ts` | 9 ниш + шаблоны | ✅ |

- [x] API `/api/content-studio/plan`, черновики в `content_posts`
- [x] Wizard UI: профиль → ниша → 7/14/30 дн. + календарь
- [x] Расширенные `business-niches` (9 ниш + шаблоны)

### 2.2 AI-картинки (`/ai-images`)
- [x] Отдельная страница `#/office/ai-images` (`ai-images-ol.js`)
- [x] Галерея + стили (minimal / photo / flat / 3d)

### 2.3 Все публикации (`/content`)
| # | OL | OnLead | Статус |
|---|-----|--------|--------|
| 1 | Доска / Сетка / День / Неделя / Месяц | Доска + список + день/неделя/месяц | ✅ |
| 2 | Колонки: Черновик → Опубликованные | draft / scheduled / published | ✅ |

- [x] CRUD постов, фильтр по статусу
- [x] Календарные виды (день/неделя/месяц)

### 2.4 Compose (`/compose`)
| # | OL | OnLead | Статус |
|---|-----|--------|--------|
| 1 | Редактор поста/сторис/reels | Стена + сторис (фото); Reels — OOS | 🟢 |
| 2 | Multi-channel, schedule, AI adapt | VK + расписание + AI текст | 🟡 |
| 3 | Watermarks, rubrics | watermarks + rubrics в контенте + compose | 🟢 |

- [x] Редактор, schedule, publish VK
- [x] AI-адаптация текста (`/api/posts/:id/ai-text`)
- [x] Watermarks (текст при publish)
- [x] Publish as story (фото из медиатеки)
- [x] Rubrics (cabinet + compose → prefix при publish)
- ❌ Reels — **out of scope** (не parity-долг; см. §7 OOS)

### 2.5 Медиатека (`/media`)
- [x] Глобальная медиатека (`/api/media`, grid UI)
- [x] Upload, delete
- [x] Use in compose (VK photo attach / медиатека picker)

### 2.6 История (`/history`)
- [x] Лог публикаций (`pub_logs`, `#/office/history`)

### 2.7 Черновики / Шаблоны / Корзина / Этапы
- [x] Статусы draft/trash, флаг template
- [x] Отдельные URL `?templates=1`, `?trash=1`, `view=stages` (алиас доски)

---

## 3. Инструменты VK — по подписке

Общий UI OL: `components/vk-tool-ui.tsx` (config + run + actions).

| Сервис | OL route | OnLead route | Backend | UI parity |
|--------|----------|--------------|---------|-------------|
| Обзор | `/vk-tools` | `#/office/tools/subscribed` | — | ✅ hub |
| Масслайкинг | `/vk-tools/masslike` | `massliking-vk` | ✅ | ✅ vk-tool-ui |
| Автопоздравления | `/vk-tools/congrats` | `congratulation-vk` | ✅ | ✅ vk-tool-ui |
| Автосторис | `/vk-tools/auto-stories` | `autostoris-vk` | ✅ | ✅ vk-tool-ui |
| Граббер | `/vk-tools/grabber` | `grabber-vk` | ✅ | ✅ vk-tool-ui |
| Инвайтинг | `/vk-tools/inviting` | `invite-vk` | ✅ | ✅ vk-tool-ui |
| Менеджер чатов | `/inbox` | `chat-manager-vk` | ✅ | ✅ vk-tool-ui |
| Менеджер групп | `/vk-tools/group-manager` | `group-manager-vk` | ✅ | ✅ vk-tool-ui |
| Веник | `/vk-tools/broom` | `broom-vk` | ✅ | ✅ vk-tool-ui |
| AI Лид-менеджер | `/vk-tools/lead-dm` | `ai-lead-vk` | ✅ | ✅ vk-tool-ui |

**Чеклист hub + vk-tool-ui (p3)**
- [x] Hub `/vk-tools` — группы «По подписке» + «Парсеры», карточки MVP/Вкл
- [x] Единая шапка: ← VK-инструменты, Включить/Выключить, Запустить сейчас
- [x] Блок статистики (сегодня / OK / ошибки / статус)
- [x] Журнал действий из campaign stats
- [x] Форма полей = OL (labels, types, defaults) — defaults/hints по инструментам
- [x] Module lock / plan gate как OL (hub «Закрыто» → тарифы; paywall «Модуль закрыт»)

---

## 4. Парсеры и списки

| Сервис | OL | OnLead | Статус |
|--------|-----|--------|--------|
| Мои списки | `/vk-tools/lists` | `#/office/tools/lists` | ✅ 🔍 UI |
| Парсинг групп | `/vk-tools/audience` | `parsing-groups-vk` | ✅ 🔍 |
| Парсинг аккаунтов | (в audience) | `parsing-accounts-vk` | ✅ OnLead+ |

**Чеклист**
- [x] Объединить парсинг в один UX как OL audience builder (вкладки списки/аккаунты/группы)
- [x] Copy IDs, export CSV
- [x] Send segment to CRM

---

## 5. Лиды и воронки

### 5.1 Лидоскоп (`/leadgen`)
| # | OL | OnLead | Статус |
|---|-----|--------|--------|
| 1 | Presets ниш, phrase packs | Ниши + фразы | ✅ |
| 2 | VK platform | VK | ✅ |
| 3 | Scan target posts/comments/both | Есть | ✅ |
| 4 | Filters: Новые/Сохранённые/Скрытые + Посты/Комментарии | lg-ol filters | ✅ |
| 5 | AI draft reply + AI score | `/api/leadgen/matches/:id/ai-*` | ✅ |
| 6 | Email/TG notify | notifyEmail + telegramChatId | ✅ |
| 7 | Manual vs schedule toggle | lg-ol-mode | ✅ |
| 8 | Groups modal | lg-groups-modal | ✅ |

**Чеклист**
- [x] UI «Лидоскоп» как OL
- [x] Фильтры status/kind + phrase/author
- [x] AI score и черновик ответа
- [x] Email + Telegram уведомления
- [x] Переключатель вручную/по расписанию

---

### 5.2 TG-боты / виджет (`/lead-bots`)
| # | OL | OnLead | Статус |
|---|-----|--------|--------|
| 1 | Лид-бот, FAQ, Запись, Виджет | 4 типа на `#/office/telegram/lead-bots` | ✅ |
| 2 | Embed snippet на сайт | `GET /api/lead-bots/:id/widget-snippet` | ✅ |
| 3 | AI scenario refine | Нет (шаблоны FSM) | 🟡 |

**OnLead:** `#/office/telegram/lead-bots`, `server/lead-bots.mjs`, `server/lead-bot-templates.mjs`

**Чеклист**
- [x] Lead-bot templates (`lead-bot-templates.mjs`)
- [x] Web widget embed + `POST /api/public/widget/:key/lead`
- [x] FAQ-bot, booking-bot, lead-bot types
- [x] AI refine сценария (`POST /api/lead-bots/:id/refine`)

---

### 5.3 Воронки-боты (`/funnels`)
| # | OL | OnLead | Статус |
|---|-----|--------|--------|
| 1 | Tabs: Товары, Заказы, Настройки | tg-funnel-tab UI | ✅ |
| 2 | Order statuses pipeline | receipt → paid/rejected labels | ✅ |
| 3 | Product catalog in funnel | `funnel.products[]` CRUD API | ✅ |

**OnLead:** `#/office/telegram/funnels/:id`, `server/tg-funnel-ol.mjs`

**Чеклист**
- [x] UI tabs Товары/Заказы/Настройки
- [x] Product CRUD in funnel
- [x] Order list with statuses как OL

---

### 5.4 Лендинги (`/landings`)
| # | OL | OnLead | Статус |
|---|-----|--------|--------|
| 1 | Единая страница: шаблоны + мои | `landingsUnifiedHtml` | ✅ |
| 2 | Section editor | `landings-ol.js` | ✅ |
| 3 | AI fill (business + city) | `/api/landings/:id/generate` | ✅ |
| 4 | Dark public `/l/{slug}` | `/#/l/{slug}` | ✅ |
| 5 | Views + leads count | viewsCount | ✅ |
| 6 | PRO: domain, UTM, pixel in editor | `landingOlProFieldsHtml` | ✅ |
| 7 | Nav: одна страница + заявки/медиа | упрощён bundle | ✅ |
| 8 | Form → CRM | POST leads → db.leads | ✅ |

**Чеклист**
- [x] PRO settings в OL editor
- [x] Упростить nav до одной страницы как OL
- [x] Публичный рендер по `landing-view.tsx`
- [x] Form → CRM автоматически

**Файлы OL:** `landings/page.tsx`, `app/l/landing-view.tsx`  
**Файлы OnLead:** `js/landings-ol.js`, `css/landings-ol.css`

---

## 6. Автопубликация (🟡 MVP)

**Маршруты:** `#/office/automation`, `#/office/rss`, `#/office/crosspost`  
**Файлы:** `server/rss.mjs`, `server/crosspost.mjs`, `server/webhooks-inbound.mjs`, `js/autopub-ol.js`

| Сервис | OL route | OnLead | Статус |
|--------|----------|--------|--------|
| RSS Autopilot | `/rss` | `#/office/rss` | ✅ |
| AI-кросспост | `/crosspost-ai` | `#/office/crosspost` | ✅ |
| Репосты VK/OK | `/repost` | grabber частично | 🟡 |
| Обзор автоматизаций | `/automation` | `#/office/automation` | ✅ |
| Webhook → draft | `/webhooks/inbound` | `POST /api/webhooks/inbound/:token` | ✅ |

**Чеклист**
- [x] RSS sources, poll job, import → drafts
- [x] AI crosspost adapt + drafts
- [x] Automation hub
- [x] Inbound webhook token + UI на обзоре
- [x] Dedicated `/webhooks/inbound` settings page (`#/office/webhooks/inbound`)
- [x] `/repost` VK MVP + online schedule; OK/другие сети — out of scope

---

## 7. Нейросотрудники (🟡 hub)

| Workstation | OL route | OnLead | Статус |
|-------------|----------|--------|--------|
| Команда агентов | `/ai-agents` | `#/office/ai-agents` (карточки-ссылки) | 🟡 |
| Content Studio | `/content-studio` | `#/office/content-studio` | 🟡 |
| Avito AI | `/avito` | — | ❌ out-of-scope |
| SEO-страницы | `/seo-pages` | — | ❌ out-of-scope |
| AI-аудит сайта | `/site-audit` | — | ❌ out-of-scope |
| КП и документы | `/proposals` | — | ❌ out-of-scope |
| Ad Kit | `/ad-kit` | — | ❌ out-of-scope |
| Конкуренты | `/competitors` | — | ❌ out-of-scope |
| Reels | `/compose` reels | — | ❌ out-of-scope |

**Примечание:** OnLead имеет `image-ai`, AI в VK-инструментах и hub `/ai-agents` — не полноценные OL workstations с чатом.

**Out of scope:** Avito, SEO-страницы, site-audit, proposals, ad-kit, competitors, **Reels** — не планируем в OnLead, пока нет явного продуктового запроса. Закрыты как out-of-scope, не как «долг parity».

---

## 8. Кабинет (🟡 MVP)

**Маршруты:** `#/office/analytics`, `#/office/settings`, `#/office/team`, `#/office/ai-agents`  
**Файлы:** `server/cabinet.mjs`, `js/cabinet-ol.js`, `css/cabinet-ol.css`

| Сервис | OL | OnLead | Статус |
|--------|-----|--------|--------|
| Аналитика | `/analytics` | `#/office/analytics` (+ funnel strip, detail API) | ✅ |
| Команда | `/team` | `#/office/team` (invite, roles, shared workspace) | ✅ |
| Рабочий процесс | `/workflow` | `#/office/workflow` | ✅ |
| Реф. программа | `/referral` | `#/office/referral` | ✅ |
| Профиль | `/profile` | `#/office/profile` | ✅ |
| Настройки | `/settings` (10+ tabs) | `#/office/settings` (9 tabs: general…privacy) | ✅ |
| Модули | `/modules` | subscriptions частично | 🟡 |
| База знаний | `/help` | academy | 🟡 |
| Баланс | (в billing) | `#/office/balance` | ✅ |

---

## Рекомендуемый порядок прохода

1. **Лендинги** — довести PRO + nav + pixel-perfect (текущий спринт)
2. **Лидоскоп** — UI/filters/AI reply
3. ~~**VK tools hub** — единый `vk-tool-ui` для 9 инструментов~~ ✅
4. ~~**Нейрокомментарии** — 5 tabs~~ ✅
5. **AI Лид-менеджер** — actions log + UI
6. ~~**Telegram** — funnels tabs + lead-bots/widget~~ ✅
7. **CRM** — stages + assignee
8. **Главная + Billing** — dashboard parity ✅
9. ~~**Контент** — compose + content board~~ 🟡 MVP
10. ~~**Автопубликация** — RSS, crosspost, webhook~~ 🟡 MVP
11. **Нейросотрудники** — hub ✅, workstations по приоритету
12. ~~**Кабинет** — analytics, team, settings~~ ✅ team + workspace
13. **Workflow** — `/workflow` OL parity ✅ MVP
14. **Контент polish** — календарь ✅, watermarks ✅, VK media attach ✅ (MVP)
15. **AI images page** — `#/office/ai-images` ✅
16. **Repost** — `#/office/repost` ✅ MVP (VK)

---

## Как работать по чеклисту

Для каждого сервиса:
1. Открыть OL страницу + `post2post/apps/web/app/(app)/...`
2. Открыть OnLead `#/office/...`
3. Пройти чеклист, отметить `[x]` в этом файле
4. PR/деploy после каждого сервиса
