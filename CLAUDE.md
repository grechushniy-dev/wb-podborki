# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Раздел «Подборки»** — новая вкладка в рекламном кабинете **WB Инфлюенс**, встраиваемая рядом с CPO и CPP. Позволяет селлерам находить тематические товарные подборки блогеров, подавать заявки на участие и отслеживать их статус.

Source of truth: `PRD_WB_Collections.md` в корне репозитория.

---

## Commands

```bash
npm run dev      # dev-сервер → http://localhost:5173
npm run build    # production build
npm run lint     # ESLint
npm run preview  # preview production build
```

---

## Tech Stack

| Слой | Технология |
|------|------------|
| UI Framework | React 18+ |
| Language | TypeScript 5.x |
| UI Components | Ant Design (antd) 5.x |
| Data Fetching | React Query (TanStack) 5.x |
| Global State | Zustand (фильтры, статус заявок) |
| Routing | React Router v6 |
| Mock API | MSW (Mock Service Worker) |
| Build Tool | Vite |

---

## Architecture

### Компонентное дерево

```
CollectionsPage                      ← корневой компонент вкладки
├── Tabs (CPO / CPP / Подборки)      ← навигация между инструментами
│   └── Badge                        ← счётчик новых подборок
├── Segmented                        ← «Все подборки» / «Мои заявки»
├── CollectionsTable                 ← список с фильтрами (тематика, дата, поиск)
│   └── CollectionDrawer             ← Drawer width=480, placement=right
│       ├── CollectionDetail         ← view: детали подборки + кнопка «Подать заявку»
│       └── ApplicationForm          ← view: 2-шаговая форма (смена view внутри Drawer, без Modal)
└── MyApplicationsTable              ← заявки текущего селлера + кнопки действий
```

**Ключевое правило:** форма заявки — это смена `view` внутри того же `Drawer`, не отдельный `Modal`.

### Структура файлов

```
src/
├── api/                   # React Query хуки
│   ├── collections.ts     # useCollections, useCollection, useThemes
│   ├── applications.ts    # useApplications, useSubmitApplication, useConfirmApplication, useShipApplication
│   └── seller.ts          # useSellerProducts
├── components/
│   ├── collections/
│   │   ├── CollectionsPage.tsx
│   │   ├── CollectionsTable.tsx
│   │   ├── CollectionDrawer.tsx
│   │   ├── CollectionDetail.tsx
│   │   └── ApplicationForm/
│   │       ├── index.tsx
│   │       ├── StepConditions.tsx
│   │       └── StepProducts.tsx
│   └── applications/
│       └── MyApplicationsTable.tsx
├── mocks/                 # MSW (только в dev)
│   ├── browser.ts
│   ├── handlers.ts        # все 8 API-эндпоинтов
│   └── data.ts            # seed-данные
├── store/
│   └── collectionsStore.ts  # Zustand: filters, selectedCollectionId, drawerView
├── types/
│   └── index.ts           # Collection, Application, Theme, SellerProduct
└── utils/
    └── statusConfig.ts    # Tag colors по статусам
```

---

## Data Models

```typescript
type CollectionStatus = 'draft' | 'moderation' | 'active' | 'closed' | 'archived';

interface Collection {
  id: string;                     // UUID
  title: string;
  theme_id: string;
  blogger_id: string;
  description: string;
  allowed_categories: string[];   // фильтрует НМ в форме заявки
  price_per_slot: number;         // RUB, минимальный порог цены
  total_slots: number;
  available_slots: number;
  deadline_at: string;            // ISO datetime
  placement_date: string;         // ISO date
  publication_date: string;       // ISO date
  status: CollectionStatus;
}

type ApplicationStatus = 'pending' | 'approved' | 'confirmed' | 'shipped' | 'rejected';

interface Application {
  id: string;
  collection_id: string;
  seller_id: string;
  offered_price: number;          // >= collection.price_per_slot
  gift_product: boolean;
  product_ids: string[];          // UUID[] — выбранные НМ
  status: ApplicationStatus;
  blogger_note: string | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  created_at: string;
}
```

---

## Application Status → Ant Design Tag

| Статус | `Tag color` | Триггер действия |
|--------|-------------|-----------------|
| `pending` | `processing` | — |
| `approved` | `warning` | Показать кнопку «Подтвердить участие» |
| `confirmed` | `success` | Показать кнопку «Товар отправлен» |
| `shipped` | `cyan` | — |
| `rejected` | `error` | — |

---

## API Endpoints

```
GET    /api/collections              — список (query: theme, date, status)
GET    /api/collections/:id          — детали подборки
GET    /api/collections/themes       — тематики для фильтра
POST   /api/applications             — подать заявку
GET    /api/applications             — заявки текущего селлера
PATCH  /api/applications/:id/confirm — финальное подтверждение
PATCH  /api/applications/:id/shipped — отметить товар отправленным
GET    /api/seller/products          — НМ селлера (query: category)
```

Все запросы аутентифицированы через JWT-токен сессии WB Инфлюенс. В dev-среде перехватываются MSW.

---

## Key Design Decisions

- **CTA-кнопка «Подать заявку» задизейблена** если `available_slots === 0` или `deadline_at < now`. Если у селлера уже есть заявка — кнопка заменяется на `Tag` с текущим статусом.
- **Фильтрация НМ** в форме заявки: отображать только товары, чьи категории входят в `collection.allowed_categories`.
- **Realtime**: React Query `refetchInterval: 30_000` как fallback для обновления статусов.
- **Адаптивность**: приоритет desktop 1440px+; `Drawer` на мобильных — 100% ширины; `Table` — `scroll={{ x: true }}`.

---

## Ant Design Theme

```tsx
<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#6B4EFF',  // бренд-цвет WB Инфлюенс
      borderRadius: 8,
      fontFamily: "'Inter', 'Roboto', sans-serif",
    },
  }}
>
```

`ConfigProvider` оборачивает всё приложение в `src/main.tsx`.

---

## Development Phases

| Фаза | Scope | Статус |
|------|-------|--------|
| **MVP (1)** | CollectionsTable + Drawer + ApplicationForm + статус `pending` | Реализовано |
| **Заявки (2)** | MyApplicationsTable, все статусы, confirm/ship | Реализовано |
| **Нотификации (3)** | notification при смене статуса (approved/rejected), Dev Simulator для тестирования | Реализовано |
| **Улучшения (4)** | Фильтры по цене и блогеру, фильтр статусов в «Мои заявки», сброс фильтров | Реализовано |

---

## Glossary

| Термин | Смысл |
|--------|-------|
| НМ / Артикул | Номенклатурный номер товара на Wildberries |
| Арсенал | Все НМ, которые селлер ведёт в WB Инфлюенс |
| Слот | Одно место в подборке для одного селлера/товара |
| CPO | Cost Per Order — существующая вкладка кабинета |
| CPP | Cost Per Post — существующая вкладка кабинета |
