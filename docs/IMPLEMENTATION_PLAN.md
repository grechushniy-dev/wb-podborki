# Implementation Plan — «Подборки» Web Application

**Стек:** React 18 + TypeScript 5 + Ant Design 5 + React Query (TanStack) + Zustand + MSW
**Пакетный менеджер:** npm
**PRD:** `PRD_WB_Collections.md`

---

## Step 0 — Project Scaffolding

```bash
cd "/Users/alexeygreek/Projects/Podborki "
npm create vite@latest . -- --template react-ts --overwrite
npm install

# Основные зависимости
npm install antd @ant-design/icons react-router-dom \
  @tanstack/react-query zustand msw dayjs

# Dev
npm install -D @types/node

# MSW
npx msw init public --save
```

`vite.config.ts` — добавить алиас:
```ts
resolve: { alias: { '@': path.resolve(__dirname, './src') } }
```

`tsconfig.app.json` — добавить:
```json
"baseUrl": ".",
"paths": { "@/*": ["src/*"] }
```

---

## Step 1 — Foundation Files

### `src/types/index.ts`
TypeScript-интерфейсы из PRD секции 6:
- `Collection` + `CollectionStatus` (`draft | moderation | active | closed | archived`)
- `Application` + `ApplicationStatus` (`pending | approved | confirmed | shipped | rejected`)
- `Theme`, `SellerProduct`, `CollectionsFilters`, `SubmitApplicationPayload`

### `src/mocks/data.ts`
Seed-данные: 6 подборок (разные статусы), 2 заявки (разные статусы), 15 НМ, 3 тематики.

### `src/mocks/handlers.ts`
MSW-обработчики для всех 8 эндпоинтов:

| Метод | Эндпоинт | Поведение |
|-------|----------|-----------|
| GET | `/api/collections` | Список с query-фильтрами `theme`, `search`, `date_from`, `date_to` |
| GET | `/api/collections/themes` | Список тематик (до `/api/collections/:id`!) |
| GET | `/api/collections/:id` | Детали подборки |
| POST | `/api/applications` | Проверить `available_slots > 0`, уменьшить счётчик |
| GET | `/api/applications` | Заявки текущего селлера |
| PATCH | `/api/applications/:id/confirm` | Сменить статус на `confirmed` |
| PATCH | `/api/applications/:id/shipped` | Сменить статус на `shipped` |
| GET | `/api/seller/products` | НМ, фильтр по `category` |

### `src/mocks/browser.ts`
```ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);
```

### `src/main.tsx`
- `worker.start({ onUnhandledRequest: 'bypass' })` перед рендером (только DEV)
- `ConfigProvider` → `colorPrimary: '#6B4EFF'`, `borderRadius: 8`, `fontFamily: 'Inter, Roboto, sans-serif'`
- `App` (Ant Design) для `message` / `notification` хуков
- `QueryClientProvider`
- `BrowserRouter`

### `src/store/collectionsStore.ts` (Zustand)
```ts
interface CollectionsStore {
  filters: CollectionsFilters;
  selectedCollectionId: string | null;
  drawerView: 'detail' | 'form';
  setFilters: (filters: Partial<CollectionsFilters>) => void;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  setDrawerView: (view: 'detail' | 'form') => void;
}
```

### `src/utils/statusConfig.ts`
Маппинг статусов → Ant Design Tag color + label для `Application` и `Collection`.

---

## Step 2 — API Layer (`src/api/`)

| Хук | Эндпоинт | Тип |
|-----|----------|-----|
| `useCollections(filters)` | `GET /api/collections` | query |
| `useCollection(id)` | `GET /api/collections/:id` | query, enabled только если id не null |
| `useThemes()` | `GET /api/collections/themes` | query, `staleTime: Infinity` |
| `useApplications()` | `GET /api/applications` | query + `refetchInterval: 30_000` |
| `useSellerProducts(categories)` | `GET /api/seller/products` | query, enabled только если categories.length > 0 |
| `useSubmitApplication()` | `POST /api/applications` | mutation, инвалидирует `['applications']` и `['collections']` |
| `useConfirmApplication()` | `PATCH /api/applications/:id/confirm` | mutation |
| `useShipApplication()` | `PATCH /api/applications/:id/shipped` | mutation |

---

## Step 3 — Component Tree

```
src/components/
├── collections/
│   ├── CollectionsPage.tsx        ← Tabs (CPO/CPP/Подборки) + Segmented
│   ├── CollectionsTable.tsx       ← Table + фильтры + Skeleton + Empty
│   ├── CollectionDrawer.tsx       ← Drawer контейнер (переключает detail | form)
│   ├── CollectionDetail.tsx       ← Descriptions, Timeline, Statistic, CTA
│   └── ApplicationForm/
│       ├── index.tsx              ← Steps (2 шага)
│       ├── StepConditions.tsx     ← InputNumber цена + Switch подарок
│       └── StepProducts.tsx       ← Table rowSelection + поиск по артикулу
└── applications/
    └── MyApplicationsTable.tsx    ← Table заявок + Tag статусы + кнопки действий
```

---

## Step 4 — Component Details

### `CollectionsPage`
- `Tabs` со stub-вкладками CPO, CPP и активной «Подборки»
- `Badge` с числом заявок в статусе `approved` (требуют действия)
- `Segmented`: «Все подборки» / «Мои заявки»
- Условный рендер `<CollectionsTable>` или `<MyApplicationsTable>`
- `<CollectionDrawer>` рендерится всегда (управляется Zustand)

### `CollectionsTable`
- Колонки: Название, Тематика (Tag), Блогер (Avatar), Цена (RUB), Свободных мест, Дата публикации, Статус (Tag)
- `Skeleton` при `isLoading`, `Empty` при пустых результатах
- Фильтры через Zustand: `Select multiple`, `Input.Search`, `DatePicker.RangePicker`
- `onRow` клик → `openDrawer(collection.id)`

### `CollectionDrawer`
- `Drawer placement='right' width={480} destroyOnClose`
- Читает `selectedCollectionId` + `drawerView` из Zustand
- Рендерит `<CollectionDetail>` или `<ApplicationForm>`

### `CollectionDetail`
- `Avatar + Typography.Link` — блок блогера
- `Statistic` — цена за слот + свободных мест (красный если 0)
- `Timeline` — 3 точки: дедлайн → размещение → публикация
- CTA-логика:
  - `disabled` если `available_slots === 0` или `deadline_at < now`
  - Если заявка уже есть → `Tag` со статусом вместо кнопки
  - Иначе → кнопка «Подать заявку» → `setDrawerView('form')`

### `ApplicationForm`
- **Шаг 1:** `InputNumber` (min = `price_per_slot`, валидация ≥ min) + `Switch` «Готов подарить товар»
- **Шаг 2:** `Table rowSelection checkbox` из `useSellerProducts(allowed_categories)` + `Input.Search` по артикулу/названию, минимум 1 товар
- `Popconfirm` перед submit → `useSubmitApplication` → `message.success` → `setDrawerView('detail')`

### `MyApplicationsTable`
- Колонки: подборка, блогер, цена, статус (Tag), дата подачи, действия
- `approved` → кнопка «Подтвердить участие» + `Popconfirm`
- `confirmed` → кнопка «Товар отправлен» + `Popconfirm`
- `notification` при появлении новых заявок в статусе `approved`

### `App.tsx`
```tsx
<Routes>
  <Route path="/" element={<Navigate to="/collections" replace />} />
  <Route path="/collections" element={<CollectionsPage />} />
</Routes>
```

---

## Verification Checklist

```bash
npm run dev   # → http://localhost:5173
```

1. Консоль браузера: `[MSW] Mocking enabled`
2. Вкладка «Подборки» — таблица с данными загружается
3. Фильтр по тематике — таблица обновляется без перезагрузки
4. Клик на строку → Drawer открывается справа
5. Кнопка «Подать заявку» → форма открывается ВНУТРИ Drawer
6. Step 1: цена ниже минимума → ошибка валидации
7. Step 2: видны только товары допустимых категорий
8. Submit → `message.success`, Drawer показывает `Tag processing`
9. «Мои заявки» → заявки в разных статусах с кнопками действий

---

## Development Phases

| Фаза | Scope | Статус |
|------|-------|--------|
| MVP (1) | CollectionsTable + Drawer + ApplicationForm + статус `pending` | Реализовано |
| Заявки (2) | MyApplicationsTable, все статусы, confirm/ship | Реализовано |
| Нотификации (3) | WebSocket/SSE, email | Планируется |
| Улучшения (4) | Фильтры по цене/блогеру, история заявок | Планируется |
