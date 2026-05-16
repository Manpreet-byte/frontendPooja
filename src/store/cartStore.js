import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const buildCartItem = (course) => ({
  id: course.id,
  slug: course.slug,
  title: course.title,
  featuredImage: course.featuredImage ?? '',
  excerptHtml: course.excerptHtml ?? '',
  link: course.link ?? '',
  priceText: course.priceText ?? '',
  currency: course.currency ?? null,
  amountCents: course.amount_cents ?? course.amountCents ?? null,
  addedAt: Date.now(),
});

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      couponCode: '',
      setItems: (items) => set({ items: Array.isArray(items) ? items : [] }),
      addCourse: (course) => {
        if (!course?.id) {
          return;
        }

        const existing = get().items.some((item) => item.id === course.id);
        if (existing) {
          return;
        }

        set((state) => ({
          items: [...state.items, buildCartItem(course)],
        }));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lf:cart_event', { detail: { kind: 'add', entity_type: 'course', entity_id: course.id } }));
        }
      },
      removeCourse: (courseId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== courseId),
        }));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lf:cart_event', { detail: { kind: 'remove', entity_type: 'course', entity_id: courseId } }));
        }
      },
      clearCart: () => set({ items: [] }),
      setCouponCode: (code) => set({ couponCode: String(code ?? '').trim() }),
      clearCouponCode: () => set({ couponCode: '' }),
      hasCourse: (courseId) => get().items.some((item) => item.id === courseId),
      cartCount: () => get().items.length,
      buyNowCourse: (course) => {
        if (!course?.id) return;
        set({ items: [buildCartItem(course)], couponCode: '' });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lf:cart_event', { detail: { kind: 'buy_now', entity_type: 'course', entity_id: course.id } }));
        }
      },
    }),
    {
      name: 'love-and-flour-cart',
      partialize: (state) => ({ items: state.items, couponCode: state.couponCode }),
    }
  )
);
