import { http, HttpResponse, delay } from 'msw';
import { collections as mockCollections, applications as mockApplications, themes, sellerProducts, CURRENT_SELLER_ID } from './data';
import type { Application, ApplicationStatus, SubmitApplicationPayload } from '@/types';

// Mutable state for mutations
let collections = [...mockCollections];
let applications = [...mockApplications];

export const handlers = [
  // GET /api/collections
  http.get('/api/collections', async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const themeParam = url.searchParams.get('theme');
    const searchParam = url.searchParams.get('search');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const priceMin = url.searchParams.get('price_min');
    const priceMax = url.searchParams.get('price_max');

    let result = collections.filter(c => c.status !== 'draft' && c.status !== 'moderation');

    if (themeParam) {
      const themeIds = themeParam.split(',');
      result = result.filter(c => c.theme_ids.some(tid => themeIds.includes(tid)));
    }
    if (searchParam) {
      result = result.filter(c => c.title.toLowerCase().includes(searchParam.toLowerCase()));
    }
    if (dateFrom) {
      result = result.filter(c => c.slots.some(s => s.publication_date >= dateFrom));
    }
    if (dateTo) {
      result = result.filter(c => c.slots.some(s => s.publication_date <= dateTo));
    }
    if (priceMin) {
      result = result.filter(c => c.slots.some(s => s.price_per_slot >= Number(priceMin)));
    }
    if (priceMax) {
      result = result.filter(c => c.slots.some(s => s.price_per_slot <= Number(priceMax)));
    }

    return HttpResponse.json({ data: result, total: result.length });
  }),

  // GET /api/collections/themes  — must be before /api/collections/:id
  http.get('/api/collections/themes', async () => {
    await delay(200);
    return HttpResponse.json({ data: themes });
  }),

  // GET /api/collections/:id
  http.get('/api/collections/:id', async ({ params }) => {
    await delay(300);
    const collection = collections.find(c => c.id === params.id);
    if (!collection) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: collection });
  }),

  // POST /api/applications
  http.post('/api/applications', async ({ request }) => {
    await delay(500);
    const body = await request.json() as SubmitApplicationPayload;

    const collection = collections.find(c => c.id === body.collection_id);
    if (!collection) {
      return HttpResponse.json({ message: 'Collection not found' }, { status: 404 });
    }

    const slot = collection.slots.find(s => s.id === body.slot_id);
    if (!slot) {
      return HttpResponse.json({ message: 'Blogger slot not found' }, { status: 404 });
    }
    if (slot.available_slots <= 0) {
      return HttpResponse.json({ message: 'No available slots' }, { status: 409 });
    }

    const existing = applications.find(
      a => a.slot_id === body.slot_id && a.seller_id === CURRENT_SELLER_ID
    );
    if (existing) {
      return HttpResponse.json({ message: 'Application already exists' }, { status: 409 });
    }

    // Decrease available_slots for the specific slot
    collections = collections.map(c => {
      if (c.id !== body.collection_id) return c;
      return {
        ...c,
        slots: c.slots.map(s =>
          s.id === body.slot_id ? { ...s, available_slots: s.available_slots - 1 } : s
        ),
      };
    });

    const newApp: Application = {
      id: `app-${Date.now()}`,
      collection_id: body.collection_id,
      slot_id: body.slot_id,
      collection_title: collection.title,
      collection_publication_date: slot.publication_date,
      blogger_name: slot.blogger_name,
      blogger_avatar: slot.blogger_avatar,
      seller_id: CURRENT_SELLER_ID,
      offered_price: body.offered_price,
      gift_product: body.gift_product,
      gift_product_ids: body.gift_product_ids ?? [],
      product_ids: body.product_ids,
      status: 'pending',
      confirmed_at: null,
      shipped_at: null,
      post_url: null,
      published_at: null,
      rejected_at: null,
      created_at: new Date().toISOString(),
    };
    applications = [...applications, newApp];

    return HttpResponse.json({ data: newApp }, { status: 201 });
  }),

  // GET /api/applications
  http.get('/api/applications', async () => {
    await delay(400);
    const sellerApps = applications.filter(a => a.seller_id === CURRENT_SELLER_ID);
    return HttpResponse.json({ data: sellerApps });
  }),

  // PATCH /api/applications/:id/confirm
  http.patch('/api/applications/:id/confirm', async ({ params }) => {
    await delay(400);
    const app = applications.find(a => a.id === params.id);
    if (!app) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    applications = applications.map(a =>
      a.id === params.id
        ? { ...a, status: 'confirmed' as ApplicationStatus, confirmed_at: new Date().toISOString() }
        : a
    );
    return HttpResponse.json({ data: applications.find(a => a.id === params.id) });
  }),

  // PATCH /api/applications/:id/shipped
  http.patch('/api/applications/:id/shipped', async ({ params }) => {
    await delay(400);
    const app = applications.find(a => a.id === params.id);
    if (!app) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    applications = applications.map(a =>
      a.id === params.id
        ? { ...a, status: 'shipped' as ApplicationStatus, shipped_at: new Date().toISOString() }
        : a
    );
    return HttpResponse.json({ data: applications.find(a => a.id === params.id) });
  }),

  // PATCH /api/dev/applications/:id/status  — DEV ONLY, симуляция действий блогера
  http.patch('/api/dev/applications/:id/status', async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as { status: ApplicationStatus; post_url?: string };
    const app = applications.find(a => a.id === params.id);
    if (!app) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const now = new Date().toISOString();
    applications = applications.map(a => {
      if (a.id !== params.id) return a;
      const updates: Partial<Application> = {
        status: body.status,
      };
      if (body.status === 'published') {
        updates.post_url = body.post_url ?? `https://www.wildberries.ru/influencer/post/${Date.now()}`;
        updates.published_at = now;
      }
      if (body.status === 'completed') {
        updates.published_at = a.published_at ?? now;
      }
      if (body.status === 'rejected') {
        updates.rejected_at = now;
      }
      return { ...a, ...updates };
    });
    return HttpResponse.json({ data: applications.find(a => a.id === params.id) });
  }),

  // GET /api/seller/products
  http.get('/api/seller/products', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const categoryParam = url.searchParams.get('category');

    let products = sellerProducts;
    if (categoryParam) {
      const cats = categoryParam.split(',');
      products = sellerProducts.filter(p => cats.includes(p.category));
    }

    return HttpResponse.json({ data: products });
  }),
];
