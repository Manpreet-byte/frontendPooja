import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import SelectMenu from '../components/SelectMenu';
import ChartCard from '../components/admin/ChartCard';
import SparklineBarChart from '../components/admin/SparklineBarChart';
import SparklineLineChart from '../components/admin/SparklineLineChart';
import DateRangePicker from '../components/admin/analytics/DateRangePicker';
import DateTimePicker from '../components/admin/DateTimePicker';
import { computeRange } from '../utils/admin/dateRange';
import { downloadCsv, exportHtmlToPdf } from '../utils/admin/exporters';
import usePageTitle from '../utils/usePageTitle';
import { formatDateTimeStandard } from '../utils/formatDate';

function formatDateOnlyValue(value) {
  return String(value ?? '').trim().slice(0, 10);
}

function getDefaultDateInputValue(offsetYears = 1) {
  const nextDate = new Date();
  nextDate.setFullYear(nextDate.getFullYear() + offsetYears);
  const year = String(nextDate.getFullYear()).padStart(4, '0');
  const month = String(nextDate.getMonth() + 1).padStart(2, '0');
  const day = String(nextDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTimePart(value, fallback = '18:30') {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const match = raw.match(/T?(\d{2}):(\d{2})(?::\d{2}(?:\.\d{3})?)?(?:Z|[+-]\d{2}:?\d{2})?$/);
  if (match) return `${match[1]}:${match[2]}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
}

function mergeDateWithTime(dateValue, existingValue, fallbackTime = '18:30') {
  const date = String(dateValue ?? '').trim();
  if (!date) return '';
  const [year, month, day] = date.split('-').map((part) => Number(part));
  if (![year, month, day].every((part) => Number.isFinite(part))) return '';
  const [hourPart, minutePart] = getTimePart(existingValue, fallbackTime).split(':').map((part) => Number(part));
  const nextDate = new Date(year, month - 1, day, Number.isFinite(hourPart) ? hourPart : 0, Number.isFinite(minutePart) ? minutePart : 0, 0, 0);
  return nextDate.toISOString();
}

function parseJsonMaybe(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

async function loadOfflineSeededContent() {
  try {
    const mod = await import('../data/seededContent');
    return {
      offlineWorkshops: Array.isArray(mod?.courses) ? mod.courses : [],
      offlineRecipes: Array.isArray(mod?.posts) ? mod.posts : [],
    };
  } catch {
    return { offlineWorkshops: [], offlineRecipes: [] };
  }
}

function stableOfflineNumericId(key) {
  const input = String(key ?? '');
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = Math.imul(hash, 33) ^ input.charCodeAt(i);
  }
  const int32 = hash | 0;
  // Keep negative to avoid clashing with DB ids (typically positive integers).
  return int32 < 0 ? int32 : -Math.abs(int32 || 1);
}

const HANDS_ON_CATEGORY_SLUGS = new Set(['hands-on-classes', 'hands-on-classes-upcoming']);

function getSeedCourseCategorySlugs(course) {
  const list = course?.taxonomies?.['course-category'];
  if (!Array.isArray(list)) return [];
  return list.map((t) => String(t?.slug ?? '').trim()).filter(Boolean);
}

function categorySlugsToIds(categorySlugs, categories) {
  if (!Array.isArray(categorySlugs) || !Array.isArray(categories)) return [];
  const slugSet = new Set(categorySlugs.map((s) => String(s)));
  return (categories ?? [])
    .filter((c) => slugSet.has(String(c?.slug ?? '')))
    .map((c) => Number(c?.id))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function normalizeOfflineCourse(course, { categoryIds = [] } = {}) {
  const slug = String(course?.slug ?? '').trim();
  const sourceExternalId = course?.id != null ? String(course.id) : '';
  const offlineKey = `offline-course:${slug || sourceExternalId || 'unknown'}`;
  return {
    __offline: true,
    __offline_key: offlineKey,
    id: stableOfflineNumericId(offlineKey),
    source: 'offline-seed',
    source_external_id: sourceExternalId || null,
    slug: slug || null,
    title: course?.title ?? 'Untitled class',
    summary: course?.excerptHtml ?? null,
    content: course?.contentHtml ?? null,
    featured_image_url: course?.featuredImage ?? null,
    currency: 'INR',
    amount_cents: course?.priceInr ? Number(course.priceInr) * 100 : null,
    compare_at_amount_cents: course?.compareAtPriceInr ? Number(course.compareAtPriceInr) * 100 : null,
    sale_amount_cents: null,
    sale_starts_at: null,
    sale_ends_at: null,
    category_ids: categoryIds,
    publish_at: null,
    qa_enabled: true,
    is_published: true,
  };
}

function normalizeOfflineWorkshop(course) {
  const slug = String(course?.slug ?? '').trim();
  const sourceExternalId = course?.id != null ? String(course.id) : '';
  const offlineKey = `offline-workshop:${slug || sourceExternalId || 'unknown'}`;
  return {
    __offline: true,
    __offline_key: offlineKey,
    id: stableOfflineNumericId(offlineKey),
    source: 'offline-seed',
    source_external_id: sourceExternalId || null,
    slug: slug || null,
    title: course?.title ?? 'Untitled workshop',
    summary: course?.excerptHtml ?? null,
    content: course?.contentHtml ?? null,
    featured_image_url: course?.featuredImage ?? null,
    currency: 'INR',
    amount_cents: course?.priceInr ? Number(course.priceInr) * 100 : null,
    compare_at_amount_cents: course?.compareAtPriceInr ? Number(course.compareAtPriceInr) * 100 : null,
    sale_amount_cents: null,
    sale_starts_at: null,
    sale_ends_at: null,
    category_ids: [],
    publish_at: null,
    qa_enabled: true,
    is_published: true,
  };
}

function normalizeOfflineRecipe(post) {
  const slug = String(post?.slug ?? '').trim();
  const sourceExternalId = post?.id != null ? String(post.id) : '';
  const offlineKey = `offline-recipe:${slug || sourceExternalId || 'unknown'}`;
  return {
    __offline: true,
    __offline_key: offlineKey,
    id: stableOfflineNumericId(offlineKey),
    source: 'offline-seed',
    source_external_id: sourceExternalId || null,
    slug: slug || null,
    title: post?.title ?? 'Untitled recipe',
    summary: post?.excerptHtml ?? null,
    content: post?.contentHtml ?? null,
    featured_image_url: post?.featuredImage ?? null,
    category_ids: [],
    tag_ids: [],
    publish_at: null,
    is_published: true,
  };
}

function mergeBySlugOrExternalId({ online = [], offline = [] } = {}) {
  const seen = new Set();
  const takeKey = (item) => {
    const slug = String(item?.slug ?? '').trim().toLowerCase();
    if (slug) return `slug:${slug}`;
    const ext = String(item?.source_external_id ?? '').trim();
    if (ext) return `ext:${ext}`;
    return `id:${String(item?.id ?? '')}`;
  };
  for (const item of online) seen.add(takeKey(item));
  const merged = [...online];
  for (const item of offline) {
    const key = takeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'Orders' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'courses', label: 'Hands-On Classes' },
  { id: 'workshops', label: 'Workshops' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'sessions', label: 'Live Sessions' },
  { id: 'recordings', label: 'Recordings' },
  { id: 'users', label: 'Users' },
  { id: 'enrollments', label: 'Enrollments' },
  { id: 'support', label: 'Support' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Site Settings' },
  { id: 'admins', label: 'Admins' },
  { id: 'super_admin', label: 'Super Admin' },
];

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED'];
const WORKSHOP_BUCKETS = [
  { slug: 'upcoming-live-workshops', label: 'Upcoming Live Workshops' },
  { slug: 'recorded-live-workshop', label: 'Recorded Live Workshops' },
  { slug: 'e-book', label: 'E-Books' },
];

function formatMoney(cents, currency = 'INR') {
  const amount = Number(cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setSession = useAuthStore((s) => s.setSession);
  usePageTitle('Admin · Love & Flour');
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);
  const [tab, setTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [overviewStatus, setOverviewStatus] = useState('idle'); // idle | loading | error
  const [overviewError, setOverviewError] = useState('');
  const [overviewRange, setOverviewRange] = useState('last_30'); // today | last_7 | last_30 | custom
  const [overviewFrom, setOverviewFrom] = useState('');
  const [overviewTo, setOverviewTo] = useState('');
  const [customRangeNonce, setCustomRangeNonce] = useState(0);
  const [revDaily, setRevDaily] = useState([]);
  const [revMonthly, setRevMonthly] = useState([]);
  const [revTotals, setRevTotals] = useState(null);
  const [enrDaily, setEnrDaily] = useState([]);
  const [enrTotals, setEnrTotals] = useState(null);
  const [topCourses, setTopCourses] = useState([]);
  const [funnel, setFunnel] = useState(null);
  const [ordersSummaryRange, setOrdersSummaryRange] = useState(null);
  const [topCoursesLimit, setTopCoursesLimit] = useState(10);
  const [systemStatus, setSystemStatus] = useState('idle'); // idle | loading | error
  const [systemError, setSystemError] = useState('');
  const [systemHealth, setSystemHealth] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);

  const sendSupportReply = async () => {
    if (!token || !isAdmin || !selectedSupportTicketId) return;
    const text = String(supportReplyDraft ?? '').trim();
    if (text.length < 2) return;
    setSupportReplySending(true);
    setMessage('');
    try {
      const thread = await api.admin.support.tickets.postMessage(token, selectedSupportTicketId, { message_text: text });
      setSupportThread(thread ?? null);
      setSupportReplyDraft('');
      // refresh list/analytics
      await loadTabData('support');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to send reply');
    } finally {
      setSupportReplySending(false);
    }
  };

  const patchSupportTicket = async (payload) => {
    if (!token || !isAdmin || !selectedSupportTicketId) return;
    setMessage('');
    try {
      const thread = await api.admin.support.tickets.patch(token, selectedSupportTicketId, payload);
      setSupportThread(thread ?? null);
      await loadTabData('support');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to update ticket');
    }
  };

  const createInstructor = async (e) => {
    e.preventDefault();
    if (!token || !isAdmin) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.instructors.create(token, instructorForm);
      setInstructorForm({ name: '', email: '', password: '', role: 'instructor', instructor_bio: '', instructor_avatar: '' });
      await loadTabData('instructors');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to create instructor');
    } finally {
      setStatus('idle');
    }
  };

  const saveInstructorPatch = async () => {
    if (!token || !isAdmin || !editingInstructorId) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.instructors.patch(token, editingInstructorId, instructorPatch);
      setEditingInstructorId(null);
      await loadTabData('instructors');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to update instructor');
    } finally {
      setStatus('idle');
    }
  };

  const [courses, setCourses] = useState([]);
  const [courseProgress, setCourseProgress] = useState(null);
  const [courseProgressStatus, setCourseProgressStatus] = useState('idle'); // idle | loading | error
  const [courseProgressError, setCourseProgressError] = useState('');
  const [workshops, setWorkshops] = useState([]);
  const [workshopBucketFilter, setWorkshopBucketFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersMeta, setOrdersMeta] = useState({ page: 1, limit: 25, total: 0, status: '', q: '' });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [users, setUsers] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [discountRules, setDiscountRules] = useState([]);
  const [courseCategories, setCourseCategories] = useState([]);
  const [workshopCategories, setWorkshopCategories] = useState([]);
  const [workshopCategoryPicker, setWorkshopCategoryPicker] = useState('');
  const [recipeCategories, setRecipeCategories] = useState([]);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editingWorkshopId, setEditingWorkshopId] = useState(null);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [recipeCategoryAddOpen, setRecipeCategoryAddOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingRecordingId, setEditingRecordingId] = useState(null);
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [editingDiscountRuleId, setEditingDiscountRuleId] = useState(null);

  const workshopCategoryLabelBySlug = useMemo(() => {
    const map = new Map();
    for (const bucket of WORKSHOP_BUCKETS) map.set(String(bucket.slug), String(bucket.label));
    return map;
  }, []);

  const filteredWorkshops = useMemo(() => {
    const slug = String(workshopBucketFilter ?? '').trim();
    if (!slug) return workshops;
    const cat = (workshopCategories ?? []).find((c) => String(c.slug) === slug);
    const id = cat?.id != null ? Number(cat.id) : null;
    if (!id || !Number.isFinite(id)) return workshops;
    return (workshops ?? []).filter((w) => (w?.category_ids ?? []).map((n) => Number(n)).includes(id));
  }, [workshops, workshopCategories, workshopBucketFilter]);

  // Support/helpdesk
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportMeta, setSupportMeta] = useState({ page: 1, limit: 25, total: 0, status: '', category: '', q: '' });
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState(null);
  const [supportThread, setSupportThread] = useState(null);
  const [supportReplyDraft, setSupportReplyDraft] = useState('');
  const [supportReplySending, setSupportReplySending] = useState(false);
  const [supportAnalytics, setSupportAnalytics] = useState(null);

  // Instructors
  const [instructors, setInstructors] = useState([]);
  const [instructorForm, setInstructorForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'instructor',
    instructor_bio: '',
    instructor_avatar: '',
  });
  const [editingInstructorId, setEditingInstructorId] = useState(null);
  const [instructorPatch, setInstructorPatch] = useState({ role: 'instructor', instructor_status: 'active' });

  const [courseForm, setCourseForm] = useState({
    title: '',
    summary: '',
    content: '',
    featured_image_url: '',
    currency: 'INR',
    price_inr: '',
    compare_at_inr: '',
    sale_price_inr: '',
    sale_starts_at: '',
    sale_ends_at: '',
    category_ids: [],
    scheduled_at: '',
    zoom_meeting_id: '',
    zoom_join_url: '',
    publish_at: '',
    qa_enabled: true,
    is_published: true,
  });

  const [workshopForm, setWorkshopForm] = useState({
    title: '',
    summary: '',
    content: '',
    featured_image_url: '',
    currency: 'INR',
    price_inr: '',
    compare_at_inr: '',
    sale_price_inr: '',
    sale_starts_at: '',
    sale_ends_at: '',
    category_ids: [],
    scheduled_at: '',
    zoom_meeting_id: '',
    zoom_join_url: '',
    publish_at: '',
    qa_enabled: true,
    is_published: true,
  });

  // Display-friendly names for selected categories (keep IDs in form state)
  const courseSelectedCategoryNames = (courseForm.category_ids || []).length
    ? (courseForm.category_ids || [])
        .map((id) => courseCategories.find((c) => String(c.id) === String(id))?.name || id)
        .join(', ')
    : '';

  const [categoryForm, setCategoryForm] = useState({ type: 'course', name: '', slug: '', description: '' });
  const [recipeForm, setRecipeForm] = useState({
    title: '',
    summary: '',
    featured_image_url: '',
    content: '',
    description: '',
    ingredients: '',
    instructions: '',
    notes: '',
    category_ids: [],
    tag_ids: [],
    publish_at: '',
    is_published: true,
  });

  const [tags, setTags] = useState([]);
  const [tagForm, setTagForm] = useState({ name: '' });

  const recipeSelectedCategoryNames = (recipeForm.category_ids || []).length
    ? (recipeForm.category_ids || [])
        .map((id) => recipeCategories.find((c) => String(c.id) === String(id))?.name || id)
        .join(', ')
    : '';
  const [sessionForm, setSessionForm] = useState({
    course_id: '',
    title: '',
    scheduled_at: '',
    status: 'upcoming',
    zoom_meeting_id: '',
    zoom_join_url: '',
  });
  const [recordingForm, setRecordingForm] = useState({
    live_session_id: '',
    course_id: '',
    recording_url: '',
    provider: '',
    recorded_at: '',
    duration_seconds: '',
  });
  const [enrollForm, setEnrollForm] = useState(() => ({ user_id: '', course_id: '', expiry_date: getDefaultDateInputValue(1) }));
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discount_type: 'amount',
    discount_value_inr: '',
    discount_percent: '',
    currency: 'INR',
    max_redemptions: '',
    max_redemptions_per_user: '',
    min_order_total_inr: '',
    starts_at: '',
    ends_at: '',
    is_active: true,
  });

  const [discountRuleForm, setDiscountRuleForm] = useState({
    min_courses: '3',
    max_courses: '5',
    discount_percent: '15',
  });

  const [broadcastForm, setBroadcastForm] = useState({
    subject: '',
    body_text: '',
  });

  const [pushForm, setPushForm] = useState({
    audience: 'all_users',
    course_id: '',
    title: '',
    body: '',
    url: '/',
  });

  const [emailOutboxStats, setEmailOutboxStats] = useState(null);
  const [emailOutbox, setEmailOutbox] = useState([]);
  const [emailOutboxFilter, setEmailOutboxFilter] = useState({ status: 'failed', q: '' });

  const [cmsStatus, setCmsStatus] = useState('idle'); // idle | loading | error
  const [cmsError, setCmsError] = useState('');
  const [cmsMeta, setCmsMeta] = useState({ homepage_updated_at: null, about_updated_at: null });
  const [homepageForm, setHomepageForm] = useState({
    title: 'Home',
    hero_badge: '',
    hero_title: '',
    hero_subtitle: '',
    hero_image_url: '',
    hero_primary_cta_label: '',
    hero_primary_cta_href: '',
    hero_secondary_cta_label: '',
    hero_secondary_cta_href: '',
    is_published: true,
  });
  const [aboutCmsForm, setAboutCmsForm] = useState({
    title: 'About',
    featured_image_url: '',
    content_html: '',
    is_published: true,
  });

  const [cmsTestimonials, setCmsTestimonials] = useState([]);
  const [testimonialForm, setTestimonialForm] = useState({
    student_name: '',
    testimonial_text: '',
    avatar_url: '',
    is_featured: false,
    is_published: true,
    sort_order: 0,
  });

  const [cmsFaqs, setCmsFaqs] = useState([]);
  const [faqForm, setFaqForm] = useState({
    category: '',
    question: '',
    answer_html: '',
    is_published: true,
    sort_order: 0,
  });

  const [cmsAnnouncements, setCmsAnnouncements] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState({
    message: '',
    cta_label: '',
    cta_url: '',
    starts_at: '',
    ends_at: '',
    is_active: true,
  });

  const [legalForm, setLegalForm] = useState({
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    content_html: '',
    status: 'published',
  });

  const [seoForm, setSeoForm] = useState({
    page: 'homepage',
    meta_title: '',
    meta_description: '',
    og_image_url: '',
    canonical_url: '',
    json_ld: '',
  });

  const [cmsGallery, setCmsGallery] = useState([]);
  const [galleryForm, setGalleryForm] = useState({
    image_url: '',
    alt_text: '',
    caption: '',
    is_featured: false,
    is_published: true,
    sort_order: 0,
  });

  const [newsletterSubscribers, setNewsletterSubscribers] = useState([]);

  const [settingsForm, setSettingsForm] = useState({
    site_name: 'Love & Flour',
    logo_url: '',
    favicon_url: '',
    gst_number: '',
    currency: 'INR',
    maintenance_mode: false,
  });

  const [razorpayConfig, setRazorpayConfig] = useState({
    mode: 'test',
    test_key_id_masked: '',
    live_key_id_masked: '',
    has_test_secret: false,
    has_live_secret: false,
    has_test_webhook_secret: false,
    has_live_webhook_secret: false,
    updated_at: null,
  });

  const [razorpayForm, setRazorpayForm] = useState({
    mode: 'test',
    test_key_id: '',
    test_key_secret: '',
    test_webhook_secret: '',
    live_key_id: '',
    live_key_secret: '',
    live_webhook_secret: '',
  });

  const [showRazorpaySecrets, setShowRazorpaySecrets] = useState(false);

  const [reportsPreset, setReportsPreset] = useState('last_30');
  const [reportsFrom, setReportsFrom] = useState('');
  const [reportsTo, setReportsTo] = useState('');
  const [reportsStatus, setReportsStatus] = useState('idle'); // idle | loading | error
  const [reportsError, setReportsError] = useState('');
  const [reportsData, setReportsData] = useState({
    range: null,
    revenue: null,
    enrollments: null,
    ordersSummary: null,
    topCourses: null,
    qa: null,
    support: null,
  });

  const disabled = useMemo(() => status === 'loading', [status]);
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  const visibleTabs = useMemo(() => {
    const base = tabs.filter((t) => t.id !== 'super_admin' && t.id !== 'admins');
    if (isSuperAdmin) return [...base, { id: 'admins', label: 'Admins' }, { id: 'super_admin', label: 'Super Admin' }];
    return base;
  }, [isSuperAdmin]);

  const [superAdmins, setSuperAdmins] = useState([]);
  const [superAdminsStatus, setSuperAdminsStatus] = useState('idle'); // idle | loading | error
  const [superAdminsError, setSuperAdminsError] = useState('');
  const [superModal, setSuperModal] = useState(null); // { type, admin }
  const [superModalBusy, setSuperModalBusy] = useState(false);
  const [superPasswordDraft, setSuperPasswordDraft] = useState('');
  const [superTransferTarget, setSuperTransferTarget] = useState('');

  const closeSuperModal = () => {
    setSuperModal(null);
    setSuperPasswordDraft('');
    setSuperTransferTarget('');
    setSuperModalBusy(false);
  };

  const uploadMediaAndGetUrl = async (file, { isPublic = true } = {}) => {
    if (!token || !isAdmin) throw new Error('Unauthorized');
    if (!file) throw new Error('No file selected');
    if (!api?.admin?.media?.upload || !api?.admin?.media?.publicFileUrl) throw new Error('Media upload is not available.');

    setMediaUploading(true);
    setMessage('');
    try {
      const res = await api.admin.media.upload(token, file, { isPublic });
      const id = res?.id;
      if (!id) throw new Error('Upload failed (missing media id).');
      return api.admin.media.publicFileUrl(id);
    } finally {
      setMediaUploading(false);
    }
  };

  const rangeToFromTo = useMemo(() => {
    const now = new Date();
    const to = new Date(now);
    const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const fmt = (d) => d.toISOString().slice(0, 10);
    if (overviewRange === 'today') {
      const from = dayStart(now);
      return { from: fmt(from), to: fmt(to) };
    }
    if (overviewRange === 'last_7') {
      const from = new Date(dayStart(now).getTime() - 6 * 24 * 60 * 60 * 1000);
      return { from: fmt(from), to: fmt(to) };
    }
    if (overviewRange === 'custom') {
      const from = overviewFrom ? String(overviewFrom) : null;
      const toV = overviewTo ? String(overviewTo) : null;
      return { from, to: toV };
    }
    // last_30 default
    const from = new Date(dayStart(now).getTime() - 29 * 24 * 60 * 60 * 1000);
    return { from: fmt(from), to: fmt(to) };
  }, [overviewRange, overviewFrom, overviewTo]);

  const overviewDisplayFrom = overviewRange === 'custom' ? String(overviewFrom || '') : String(rangeToFromTo.from || '');
  const overviewDisplayTo = overviewRange === 'custom' ? String(overviewTo || '') : String(rangeToFromTo.to || '');

  const applyOverviewRangeFromTopbar = ({ from, to }) => {
    const nextFrom = String(from || '').slice(0, 10);
    const nextTo = String(to || '').slice(0, 10);
    if (!nextFrom || !nextTo) {
      setOverviewRange('custom');
      setOverviewFrom(nextFrom);
      setOverviewTo(nextTo);
      return;
    }

    // Keep a sane order (from <= to).
    const orderedFrom = nextFrom <= nextTo ? nextFrom : nextTo;
    const orderedTo = nextFrom <= nextTo ? nextTo : nextFrom;

    setOverviewRange('custom');
    setOverviewFrom(orderedFrom);
    setOverviewTo(orderedTo);
    setCustomRangeNonce((n) => n + 1);
  };

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (tab !== 'super_admin') return;
    if (!token || !isAdmin) return;
    if (!isSuperAdmin) {
      setSuperAdmins([]);
      setSuperAdminsStatus('error');
      setSuperAdminsError('Forbidden.');
      return;
    }
    let active = true;
    setSuperAdminsStatus('loading');
    setSuperAdminsError('');
    api.admin.super.admins
      .list(token)
      .then((data) => {
        if (!active) return;
        setSuperAdmins(data?.admins ?? []);
        setSuperAdminsStatus('idle');
      })
      .catch((err) => {
        if (!active) return;
        const statusCode = err?.status;
        if (statusCode === 403) setSuperAdminsError('Forbidden. Super admin access required.');
        else setSuperAdminsError(err?.message ?? 'Failed to load admins.');
        setSuperAdminsStatus('error');
      });
    return () => {
      active = false;
    };
  }, [tab, token, isAdmin, isSuperAdmin]);

  const superDoRevoke = async (adminRow) => {
    if (!token) return;
    if (!adminRow?.id) return;
    setSuperModalBusy(true);
    setMessage('');
    try {
      await api.admin.super.admins.revoke(token, adminRow.id);
      setMessage('Admin access revoked.');
      const data = await api.admin.super.admins.list(token);
      setSuperAdmins(data?.admins ?? []);
      closeSuperModal();
    } catch (err) {
      if (err?.status === 403) setMessage('Forbidden. Super admin access required.');
      else setMessage(err?.message ?? 'Failed to revoke admin.');
      setSuperModalBusy(false);
    }
  };

  const superDoResetPassword = async (adminRow) => {
    if (!token) return;
    if (!adminRow?.id) return;
    const nextPassword = String(superPasswordDraft ?? '').trim();
    if (nextPassword.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    setSuperModalBusy(true);
    setMessage('');
    try {
      await api.admin.super.admins.resetPassword(token, adminRow.id, { password: nextPassword });
      setMessage('Password reset. The admin will be logged out on their next request.');
      // If we reset our own password, our token gets revoked via token_version bump.
      if (Number(adminRow.id) === Number(user?.id)) {
        await logout();
        navigate('/login', { replace: true });
        return;
      }
      closeSuperModal();
    } catch (err) {
      if (err?.status === 403) setMessage('Forbidden. Super admin access required.');
      else setMessage(err?.message ?? 'Failed to reset password.');
      setSuperModalBusy(false);
    }
  };

  const superDoTransfer = async () => {
    if (!token) return;
    const targetUserId = Number(superTransferTarget);
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      setMessage('Pick a valid target admin.');
      return;
    }
    setSuperModalBusy(true);
    setMessage('');
    try {
      await api.admin.super.transfer(token, { targetUserId });
      // This action revokes our current token_version and changes our role -> force logout.
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      if (err?.status === 403) setMessage('Forbidden. Super admin access required.');
      else setMessage(err?.message ?? 'Failed to transfer super admin.');
      setSuperModalBusy(false);
    }
  };

  useEffect(() => {
    if (tab !== 'overview') return;
    if (!token || !isAdmin) return;
    if (overviewRange === 'custom') {
      if (!overviewFrom || !overviewTo) return;
      if (customRangeNonce === 0) return;
    }
    loadTabData('overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token, isAdmin, overviewRange, customRangeNonce]);

  // Orders tab should react to search/filters/pagination (no manual refresh button).
  useEffect(() => {
    if (tab !== 'orders') return undefined;
    if (!token || !isAdmin) return undefined;

    const hasQuery = Boolean(String(ordersMeta.q ?? '').trim());
    const delayMs = hasQuery ? 350 : 0;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setOrdersError('');
        setOrdersLoading(true);
        const data = await api.admin.orders.list(token, {
          status: ordersMeta.status || undefined,
          q: ordersMeta.q || undefined,
          page: ordersMeta.page,
          limit: ordersMeta.limit,
        });
        if (cancelled) return;
        setOrders(data?.orders ?? []);
        setOrdersMeta((s) => ({
          ...s,
          total: Number(data?.total ?? 0),
          page: Number(data?.page ?? s.page),
          limit: Number(data?.limit ?? s.limit),
        }));
      } catch (err) {
        if (cancelled) return;
        setOrders([]);
        setOrdersError(err?.message || 'Failed to load orders.');
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tab, token, isAdmin, ordersMeta.status, ordersMeta.q, ordersMeta.page, ordersMeta.limit]);

  const checkDashboard = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const data = await api.admin.dashboard(token);
      setMessage(`Admin access OK: ${data.scope}`);
    } catch (err) {
      setMessage(err?.message ?? 'Failed');
    } finally {
      setStatus('idle');
    }
  };

  const loadTabData = async (nextTab) => {
    if (!token || !isAdmin) return;
    setStatus('loading');
    setMessage('');
    try {
      if (nextTab === 'overview') {
        setOverviewStatus('loading');
        setOverviewError('');
        setSystemStatus('loading');
        setSystemError('');
        const range = rangeToFromTo;
        const [dash, rev, enr, top, conv, ordersSum] = await Promise.all([
          api.admin.analytics.dashboard(token),
          api.admin.analytics.revenue(token, range),
          api.admin.analytics.enrollments(token, range),
          api.admin.analytics.topCourses(token, range),
          api.admin.analytics.conversions(token, range),
          api.admin.analytics.ordersSummary(token, range),
        ]);
        const [sysH, sysM] = await Promise.allSettled([api.admin.system.health(token), api.admin.system.metrics(token)]);
        setAnalytics(dash?.dashboard ?? dash?.analytics ?? dash);
        setRevDaily(rev?.revenue?.daily ?? rev?.daily ?? []);
        setRevMonthly(rev?.revenue?.monthly ?? rev?.monthly ?? []);
        setRevTotals(rev?.revenue?.totals ?? rev?.totals ?? null);
        setEnrDaily(enr?.enrollments?.daily ?? enr?.daily ?? []);
        setEnrTotals(enr?.enrollments?.totals ?? enr?.totals ?? null);
        setTopCourses(top?.top_courses?.by_revenue ?? top?.by_revenue ?? []);
        setFunnel(conv?.conversions ?? conv ?? null);
        setOrdersSummaryRange(ordersSum?.orders_summary ?? ordersSum ?? null);
        if (sysH.status === 'fulfilled') setSystemHealth(sysH.value ?? null);
        if (sysM.status === 'fulfilled') setSystemMetrics(sysM.value ?? null);
        const sysErr = [sysH, sysM]
          .filter((r) => r.status === 'rejected')
          .map((r) => r.reason?.message ?? 'Failed to load system status');
        if (sysErr.length) {
          setSystemStatus('error');
          setSystemError(sysErr[0]);
        } else {
          setSystemStatus('idle');
          setSystemError('');
        }
        setOverviewStatus('idle');
      } else if (nextTab === 'orders') {
        // Orders list is loaded via the reactive effect (search/pagination/filter).
      } else if (nextTab === 'coupons') {
        const data = await api.admin.coupons.list(token);
        setCoupons(data?.coupons ?? []);
		      } else if (nextTab === 'courses') {
		        const [data, cats, offline] = await Promise.all([
              api.admin.courses.list(token, { kind: 'course' }),
              api.admin.categories.list(token, 'course'),
              loadOfflineSeededContent(),
            ]);
		        const list = data?.courses ?? [];
		        const courseCats = cats?.categories ?? [];
		        setCourseCategories(courseCats);
		        const handsOnId = courseCats.find((c) => String(c.slug) === 'hands-on-classes')?.id;

            const seeded = offline?.offlineWorkshops ?? [];
            const seededHandsOn = (seeded ?? []).filter((c) => getSeedCourseCategorySlugs(c).some((s) => HANDS_ON_CATEGORY_SLUGS.has(s)));
            const offlineCourses = seededHandsOn.map((c) => {
              const slugs = getSeedCourseCategorySlugs(c);
              const categoryIds = categorySlugsToIds(slugs, courseCats);
              return normalizeOfflineCourse(c, { categoryIds });
            });

            const merged = mergeBySlugOrExternalId({ online: list, offline: offlineCourses });

		        // Show all courses that are categorized as Hands-On classes OR were imported from the external source
		        if (handsOnId) {
		          setCourses(
		            merged.filter((c) => {
		              const catIds = (c?.category_ids ?? []).map((n) => Number(n));
		              const hasHandsOn = catIds.includes(Number(handsOnId));
		              const imported = String(c?.source ?? '').trim() === 'loveandflourbypooja' || Boolean(c?.source_external_id);
		              return hasHandsOn || imported;
		            }),
		          );
		        } else {
		          // No explicit Hands-On category found — show all courses so offline content remains editable
		          setCourses(merged);
		        }
		      } else if (nextTab === 'workshops') {
	        const [data, cats, offline] = await Promise.all([
	          api.admin.courses.list(token, { kind: 'workshop' }),
	          api.admin.categories.list(token, 'workshop'),
	          loadOfflineSeededContent(),
	        ]);
	        const onlineWorkshops = data?.courses ?? [];
	        const offlineWorkshops = (offline?.offlineWorkshops ?? []).map(normalizeOfflineWorkshop);
	        setWorkshops(mergeBySlugOrExternalId({ online: onlineWorkshops, offline: offlineWorkshops }));
	        setWorkshopCategories(cats?.categories ?? []);
	      } else if (nextTab === 'recipes') {
	        const [data, cats, tagData, offline] = await Promise.all([
	          api.admin.recipes.list(token),
	          api.admin.categories.list(token, 'recipe'),
	          api.admin.tags.list(token, { type: 'recipe' }),
	          loadOfflineSeededContent(),
	        ]);
	        const onlineRecipes = data?.recipes ?? [];
	        const offlineRecipes = (offline?.offlineRecipes ?? []).map(normalizeOfflineRecipe);
	        setRecipes(mergeBySlugOrExternalId({ online: onlineRecipes, offline: offlineRecipes }));
	        setRecipeCategories(cats.categories ?? []);
	        setTags(tagData?.tags ?? []);
	      } else if (nextTab === 'sessions') {
        const data = await api.admin.liveSessions.list(token);
        setSessions(data.live_sessions ?? []);
      } else if (nextTab === 'recordings') {
        const data = await api.admin.recordings.list(token);
        setRecordings(data.recordings ?? []);
      } else if (nextTab === 'users') {
        const data = await api.admin.users.list(token);
        setUsers(data.users ?? []);
      } else if (nextTab === 'enrollments') {
        const data = await api.admin.enrollments.list(token);
        setEnrollments(data.enrollments ?? []);
      } else if (nextTab === 'support') {
        const [list, analytics] = await Promise.all([
          api.admin.support.tickets.list(token, {
            status: supportMeta.status || undefined,
            category: supportMeta.category || undefined,
            q: supportMeta.q || undefined,
            page: supportMeta.page,
            limit: supportMeta.limit,
          }),
          api.admin.support.analytics(token, { days: 30 }),
        ]);
        setSupportTickets(list?.tickets ?? []);
        setSupportMeta((s) => ({
          ...s,
          total: Number(list?.total ?? 0),
          page: Number(list?.page ?? s.page),
          limit: Number(list?.limit ?? s.limit),
        }));
        setSupportAnalytics(analytics?.analytics ?? analytics ?? null);
        if (selectedSupportTicketId) {
          const thread = await api.admin.support.tickets.get(token, selectedSupportTicketId);
          setSupportThread(thread ?? null);
        }
      } else if (nextTab === 'instructors') {
        const data = await api.admin.instructors.list(token);
        setInstructors(data?.instructors ?? []);
      } else if (nextTab === 'admins') {
        const data = await api.admin.users.list(token);
        setAdmins((data.users ?? []).filter((u) => u.role === 'admin'));
      } else if (nextTab === 'discount_rules') {
        const data = await api.admin.discountRules.list(token);
        setDiscountRules(data?.rules ?? []);
      } else if (nextTab === 'notifications') {
        const [stats, outbox] = await Promise.all([
          api.admin.emails.stats(token),
          api.admin.emails.outbox(token, { status: emailOutboxFilter.status || undefined, q: emailOutboxFilter.q || undefined, limit: 25, offset: 0 }),
        ]);
        setEmailOutboxStats(stats?.stats ?? stats ?? null);
        setEmailOutbox(outbox?.outbox ?? outbox ?? []);
      } else if (nextTab === 'settings') {
        const [data, rp] = await Promise.all([api.admin.settings.get(token), api.admin.payments.razorpay.get(token)]);
        const s = data?.settings ?? {};
        setSettingsForm((prev) => ({
          ...prev,
          site_name: s.site_name ?? prev.site_name,
          logo_url: s.logo_url ?? prev.logo_url,
          favicon_url: s.favicon_url ?? prev.favicon_url,
          gst_number: s.gst_number ?? prev.gst_number,
          currency: s.currency ?? prev.currency,
          maintenance_mode: s.maintenance_mode ?? prev.maintenance_mode,
	        }));
	        const cfg = rp?.config ?? {};
	        setRazorpayConfig((prev) => ({ ...prev, ...cfg }));
	        setRazorpayForm((prev) => ({ ...prev, mode: cfg.mode ?? prev.mode }));
	      }
	    } catch (err) {
	      setMessage(err?.message ?? 'Failed');
	      if (nextTab === 'overview') {
	        setOverviewStatus('error');
	        setOverviewError(err?.message ?? 'Failed to load analytics');
	      }
	    } finally {
	      setStatus('idle');
	    }
		  };

  const onTab = async (next) => {
    const nextId = String(next ?? '');
    if (!visibleTabs.some((t) => t.id === nextId)) {
      setMessage('Forbidden.');
      return;
    }
    if ((nextId === 'admins' || nextId === 'super_admin') && !isSuperAdmin) {
      setMessage('Forbidden. Super admin access required.');
      return;
    }
    setTab(nextId);
    await loadTabData(nextId);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const topbar = document.querySelector('.admin-topbar');
        if (topbar?.scrollIntoView) {
          topbar.scrollIntoView({ block: 'start', behavior: 'instant' });
          // Account for fixed site header so the tab always starts visibly below it.
          window.scrollBy({ top: -110, left: 0, behavior: 'instant' });
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
      });
    }
  };

  const saveHomepage = async () => {
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.cms.patchHomepage(token, {
        title: homepageForm.title || 'Home',
        // Keep homepage hero consistent for all visitors: always publish on save.
        is_published: true,
        content: {
          hero: {
            badge: homepageForm.hero_badge,
            title: homepageForm.hero_title,
            subtitle: homepageForm.hero_subtitle,
            image_url: homepageForm.hero_image_url,
            primary_cta_label: homepageForm.hero_primary_cta_label,
            primary_cta_href: homepageForm.hero_primary_cta_href,
            secondary_cta_label: homepageForm.hero_secondary_cta_label,
            secondary_cta_href: homepageForm.hero_secondary_cta_href,
          },
        },
      });
      setMessage('Homepage updated.');
      await loadTabData('content');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to save homepage');
    } finally {
      setStatus('idle');
    }
  };

  const saveAbout = async () => {
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.cms.patchAbout(token, {
        title: aboutCmsForm.title || 'About',
        is_published: aboutCmsForm.is_published,
        content: {
          featured_image_url: aboutCmsForm.featured_image_url || null,
        },
        content_html: aboutCmsForm.content_html || '',
      });
      setMessage('About page updated.');
      await loadTabData('content');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to save about page');
    } finally {
      setStatus('idle');
    }
  };

  const addTestimonial = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.cms.testimonials.create(token, testimonialForm);
      setMessage('Testimonial added.');
      setTestimonialForm({ student_name: '', testimonial_text: '', avatar_url: '', is_featured: false, is_published: true, sort_order: 0 });
      await loadTabData('content');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to add testimonial');
    } finally {
      setStatus('idle');
    }
  };

  const deleteTestimonial = async (id) => {
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.cms.testimonials.remove(token, id);
      setMessage('Testimonial deleted.');
      await loadTabData('content');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to delete testimonial');
    } finally {
      setStatus('idle');
    }
  };

  const addFaq = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.cms.faqs.create(token, faqForm);
      setMessage('FAQ added.');
      setFaqForm({ category: '', question: '', answer_html: '', is_published: true, sort_order: 0 });
      await loadTabData('content');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to add FAQ');
    } finally {
      setStatus('idle');
    }
  };

  const deleteFaq = async (id) => {
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.cms.faqs.remove(token, id);
      setMessage('FAQ deleted.');
      await loadTabData('content');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to delete FAQ');
    } finally {
      setStatus('idle');
    }
  };

  const createAnnouncement = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.cms.announcements.create(token, announcementForm);
      setMessage('Announcement saved.');
      setAnnouncementForm({ message: '', cta_label: '', cta_url: '', starts_at: '', ends_at: '', is_active: true });
      await loadTabData('content');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to save announcement');
    } finally {
      setStatus('idle');
    }
  };

  const saveLegal = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.cms.legal.patch(token, legalForm.slug, {
        title: legalForm.title,
        content_html: legalForm.content_html,
        status: legalForm.status,
      });
      setMessage('Legal page saved.');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to save legal page');
    } finally {
      setStatus('idle');
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.settings.patch(token, settingsForm);
      setMessage('Settings saved.');
      await loadTabData('settings');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to save settings');
    } finally {
      setStatus('idle');
    }
  };

  const saveRazorpayConfig = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      const maybe = (value) => {
        const v = String(value ?? '').trim();
        return v ? v : undefined;
      };
      const res = await api.admin.payments.razorpay.patch(token, {
        mode: razorpayForm.mode,
        test_key_id: maybe(razorpayForm.test_key_id),
        test_key_secret: maybe(razorpayForm.test_key_secret),
        test_webhook_secret: maybe(razorpayForm.test_webhook_secret),
        live_key_id: maybe(razorpayForm.live_key_id),
        live_key_secret: maybe(razorpayForm.live_key_secret),
        live_webhook_secret: maybe(razorpayForm.live_webhook_secret),
      });
      setRazorpayConfig((prev) => ({ ...prev, ...(res?.config ?? {}) }));
      setRazorpayForm((prev) => ({ ...prev, test_key_secret: '', test_webhook_secret: '', live_key_secret: '', live_webhook_secret: '' }));
      setMessage('Razorpay settings saved.');
      await loadTabData('settings');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to save Razorpay settings');
    } finally {
      setStatus('idle');
    }
  };

  const submitBroadcast = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await api.admin.notifications.broadcast(token, { ...broadcastForm, audience: 'newsletter' });
      setMessage(`Broadcast queued for ${Number(res?.queued ?? 0)} subscribers.`);
      setBroadcastForm({ subject: '', body_text: '' });
    } catch (err) {
      setMessage(err?.message ?? 'Failed to queue broadcast');
    } finally {
      setStatus('idle');
    }
  };

  const submitPush = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      const payload = {
        audience: pushForm.audience,
        course_id: pushForm.audience === 'course_enrolled' ? Number(pushForm.course_id) : null,
        title: pushForm.title,
        body: pushForm.body,
        url: pushForm.url || '/',
      };
      const res = await api.admin.notifications.push(token, payload);
      setMessage(`Push queued for ${Number(res?.queued ?? 0)} devices.`);
      setPushForm((s) => ({ ...s, title: '', body: '' }));
    } catch (err) {
      setMessage(err?.message ?? 'Failed to queue push notification');
    } finally {
      setStatus('idle');
    }
  };

  const refreshEmailOutbox = async () => {
    if (!token || !isAdmin) return;
    setStatus('loading');
    setMessage('');
    try {
      const [stats, outbox] = await Promise.all([
        api.admin.emails.stats(token),
        api.admin.emails.outbox(token, { status: emailOutboxFilter.status || undefined, q: emailOutboxFilter.q || undefined, limit: 25, offset: 0 }),
      ]);
      setEmailOutboxStats(stats?.stats ?? stats ?? null);
      setEmailOutbox(outbox?.outbox ?? outbox ?? []);
    } catch (err) {
      setMessage(err?.message ?? 'Failed to load email outbox');
    } finally {
      setStatus('idle');
    }
  };

  const resendOutboxEmail = async (id) => {
    if (!token || !isAdmin) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.emails.resend(token, id);
      setMessage('Email re-queued.');
      await refreshEmailOutbox();
    } catch (err) {
      setMessage(err?.message ?? 'Failed to re-queue email');
    } finally {
      setStatus('idle');
    }
  };

  const generateReports = async () => {
    if (!token || !isAdmin) return;
    const range = computeRange({ preset: reportsPreset, from: reportsFrom, to: reportsTo });
    if (range.preset === 'custom' && (!range.from || !range.to)) {
      setReportsStatus('error');
      setReportsError('Select both From and To dates for a custom range.');
      return;
    }

    setReportsStatus('loading');
    setReportsError('');
    setMessage('');
    try {
      const [rev, enr, ordersSum, top, qa, support] = await Promise.all([
        api.admin.analytics.revenue(token, range),
        api.admin.analytics.enrollments(token, range),
        api.admin.analytics.ordersSummary(token, range),
        api.admin.analytics.topCourses(token, range),
        api.admin.analytics.qa(token, range),
        api.admin.analytics.support(token, range),
      ]);
      setReportsData({
        range,
        revenue: rev?.revenue ?? rev ?? null,
        enrollments: enr?.enrollments ?? enr ?? null,
        ordersSummary: ordersSum?.orders_summary ?? ordersSum ?? null,
        topCourses: top?.top_courses ?? top ?? null,
        qa: qa?.qa ?? qa ?? null,
        support: support?.support ?? support ?? null,
      });
      setReportsStatus('idle');
      setReportsError('');
      setMessage('Report generated.');
    } catch (err) {
      setReportsStatus('error');
      setReportsError(err?.message ?? 'Failed to generate report');
      setMessage(err?.message ?? 'Failed to generate report');
    }
  };

  const exportRevenueCsv = () => {
    const rev = reportsData.revenue;
    const range = reportsData.range;
    const daily = rev?.daily ?? [];
    downloadCsv({
      filename: `revenue_${range?.from || 'from'}_${range?.to || 'to'}.csv`,
      headers: ['day', 'revenue_cents', 'payments'],
      rows: daily.map((d) => [d.day, d.revenue_cents, d.payments]),
    });
  };

  const exportRevenuePdf = () => {
    const rev = reportsData.revenue;
    const range = reportsData.range;
    const daily = rev?.daily ?? [];
    const html = `<table>
      <thead><tr><th>Day</th><th>Revenue</th><th>Payments</th></tr></thead>
      <tbody>
        ${daily
          .map(
            (d) =>
              `<tr><td>${String(d.day ?? '')}</td><td>${formatMoney(d.revenue_cents, 'INR')}</td><td>${Number(d.payments ?? 0)}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>`;
    exportHtmlToPdf({ title: `Revenue report (${range?.from || ''} → ${range?.to || ''})`, html });
  };

  const exportOrdersCsv = () => {
    const os = reportsData.ordersSummary;
    const range = reportsData.range;
    const rows = os?.summary ?? os?.rows ?? os?.data ?? os?.summary_rows ?? os?.summary ?? [];
    downloadCsv({
      filename: `orders_summary_${range?.from || 'from'}_${range?.to || 'to'}.csv`,
      headers: ['status', 'orders', 'total_cents'],
      rows: (rows ?? []).map((r) => [r.status, r.orders, r.total_cents]),
    });
  };

  const exportOrdersPdf = () => {
    const os = reportsData.ordersSummary;
    const range = reportsData.range;
    const rows = os?.summary ?? [];
    const html = `<table>
      <thead><tr><th>Status</th><th>Orders</th><th>Total</th></tr></thead>
      <tbody>
        ${(rows ?? [])
          .map(
            (r) =>
              `<tr><td>${String(r.status ?? '')}</td><td>${Number(r.orders ?? 0)}</td><td>${formatMoney(r.total_cents, 'INR')}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>`;
    exportHtmlToPdf({ title: `Orders summary (${range?.from || ''} → ${range?.to || ''})`, html });
  };

  const exportEnrollmentsCsv = () => {
    const enr = reportsData.enrollments;
    const range = reportsData.range;
    const daily = enr?.daily ?? [];
    downloadCsv({
      filename: `enrollments_${range?.from || 'from'}_${range?.to || 'to'}.csv`,
      headers: ['day', 'enrollments'],
      rows: daily.map((d) => [d.day, d.enrollments]),
    });
  };

  const exportEnrollmentsPdf = () => {
    const enr = reportsData.enrollments;
    const range = reportsData.range;
    const daily = enr?.daily ?? [];
    const html = `<table>
      <thead><tr><th>Day</th><th>Enrollments</th></tr></thead>
      <tbody>
        ${(daily ?? []).map((d) => `<tr><td>${String(d.day ?? '')}</td><td>${Number(d.enrollments ?? 0)}</td></tr>`).join('')}
      </tbody>
    </table>`;
    exportHtmlToPdf({ title: `Enrollments (${range?.from || ''} → ${range?.to || ''})`, html });
  };

  const exportTopCoursesCsv = () => {
    const top = reportsData.topCourses;
    const range = reportsData.range;
    const byRevenue = top?.by_revenue ?? [];
    downloadCsv({
      filename: `top_courses_${range?.from || 'from'}_${range?.to || 'to'}.csv`,
      headers: ['course_id', 'title', 'revenue_cents', 'orders'],
      rows: byRevenue.map((c) => [c.course_id, c.title, c.revenue_cents, c.orders]),
    });
  };

  const exportTopCoursesPdf = () => {
    const top = reportsData.topCourses;
    const range = reportsData.range;
    const byRevenue = top?.by_revenue ?? [];
    const html = `<table>
      <thead><tr><th>Course</th><th>Revenue</th><th>Orders</th></tr></thead>
      <tbody>
        ${(byRevenue ?? [])
          .map(
            (c) =>
              `<tr><td>${String(c.title ?? '')} (#${String(c.course_id ?? '')})</td><td>${formatMoney(c.revenue_cents, 'INR')}</td><td>${Number(c.orders ?? 0)}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>`;
    exportHtmlToPdf({ title: `Top courses (${range?.from || ''} → ${range?.to || ''})`, html });
  };

  const createDiscountRule = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      const payload = {
        min_courses: Number(discountRuleForm.min_courses),
        max_courses: discountRuleForm.max_courses === '' ? null : Number(discountRuleForm.max_courses),
        discount_percent: Number(discountRuleForm.discount_percent),
        is_active: true,
      };
      await api.admin.discountRules.create(token, payload);
      setMessage('Discount rule created.');
      setDiscountRuleForm({ min_courses: '3', max_courses: '5', discount_percent: '15' });
      await loadTabData('discount_rules');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to create discount rule');
    } finally {
      setStatus('idle');
    }
  };

  const beginDiscountRuleEdit = (r) => {
    setEditingDiscountRuleId(r.id);
    setDiscountRuleForm({
      min_courses: String(r.min_courses ?? ''),
      max_courses: r.max_courses == null ? '' : String(r.max_courses),
      discount_percent: String(r.discount_percent ?? ''),
    });
  };

  const cancelDiscountRuleEdit = () => {
    setEditingDiscountRuleId(null);
    setDiscountRuleForm({ min_courses: '3', max_courses: '5', discount_percent: '15' });
  };

  const saveDiscountRuleEdit = async (e) => {
    e.preventDefault();
    if (!token || !editingDiscountRuleId) return;
    setStatus('loading');
    setMessage('');
    try {
      const payload = {
        min_courses: Number(discountRuleForm.min_courses),
        max_courses: discountRuleForm.max_courses === '' ? null : Number(discountRuleForm.max_courses),
        discount_percent: Number(discountRuleForm.discount_percent),
      };
      await api.admin.discountRules.patch(token, editingDiscountRuleId, payload);
      setMessage('Discount rule updated.');
      setEditingDiscountRuleId(null);
      setDiscountRuleForm({ min_courses: '3', max_courses: '5', discount_percent: '15' });
      await loadTabData('discount_rules');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to update discount rule');
    } finally {
      setStatus('idle');
    }
  };

  const deleteDiscountRule = async (id) => {
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.discountRules.remove(token, id);
      setMessage('Discount rule deleted.');
      await loadTabData('discount_rules');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to delete discount rule');
    } finally {
      setStatus('idle');
    }
  };

  const saveSeo = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.cms.seo.patch(token, seoForm.page, {
        meta_title: seoForm.meta_title || null,
        meta_description: seoForm.meta_description || null,
        og_image_url: seoForm.og_image_url || null,
        canonical_url: seoForm.canonical_url || null,
        json_ld: seoForm.json_ld || null,
      });
      setMessage('SEO saved.');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to save SEO');
    } finally {
      setStatus('idle');
    }
  };

  const addGalleryItem = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.cms.gallery.create(token, galleryForm);
      setMessage('Gallery item added.');
      setGalleryForm({ image_url: '', alt_text: '', caption: '', is_featured: false, is_published: true, sort_order: 0 });
      await loadTabData('content');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to add gallery item');
    } finally {
      setStatus('idle');
    }
  };

  const deleteGalleryItem = async (id) => {
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.cms.gallery.remove(token, id);
      setMessage('Gallery item deleted.');
      await loadTabData('content');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to delete gallery item');
    } finally {
      setStatus('idle');
    }
  };

  const rangeOrderTotals = useMemo(() => {
    const summary = ordersSummaryRange?.summary ?? ordersSummaryRange?.orders_summary?.summary ?? [];
    const total = (summary ?? []).reduce((acc, row) => acc + Number(row?.orders ?? 0), 0);
    return { total, summary };
  }, [ordersSummaryRange]);

  const monthlyRevenueForRangeCents = useMemo(() => {
    const rows = (revMonthly ?? []).slice();
    if (!rows.length) return 0;
    const last = rows[rows.length - 1];
    return Number(last?.revenue_cents ?? 0);
  }, [revMonthly]);

  const wooSummaryNormalized = useMemo(() => {
    const summary = rangeOrderTotals.summary ?? [];
    const map = new Map((summary ?? []).map((r) => [String(r.status), r]));
    const statuses = ['pending', 'completed', 'refunded'];
    return statuses.map((status) => {
      const row = map.get(status);
      return {
        status,
        orders: Number(row?.orders ?? 0),
        total_cents: Number(row?.total_cents ?? 0),
      };
    });
  }, [rangeOrderTotals.summary]);

  const workshopCategoryById = useMemo(() => {
    const map = new Map();
    for (const c of workshopCategories ?? []) {
      map.set(String(c.id), { slug: String(c.slug ?? ''), name: String(c.name ?? '') });
    }
    return map;
  }, [workshopCategories]);

  const workshopCategoryOptions = useMemo(
    () =>
      (workshopCategories ?? []).map((cat) => ({
        value: String(cat.id),
        label: workshopCategoryLabelBySlug.get(String(cat.slug)) ?? String(cat.name ?? ''),
      })),
    [workshopCategories, workshopCategoryLabelBySlug],
  );

  const workshopSelectedCategoryLabels = useMemo(
    () =>
      (workshopForm.category_ids ?? [])
        .map((id) => workshopCategoryById.get(String(id))?.name ?? workshopCategoryLabelBySlug.get(workshopCategoryById.get(String(id))?.slug ?? '') ?? String(id))
        .filter(Boolean),
    [workshopCategoryById, workshopCategoryLabelBySlug, workshopForm.category_ids],
  );

  const workshopCategoryIdBySlug = useMemo(() => {
    const map = new Map();
    for (const c of workshopCategories ?? []) {
      if (!c?.slug) continue;
      map.set(String(c.slug), Number(c.id));
    }
    return map;
  }, [workshopCategories]);

  const handsOnCategoryId = useMemo(() => {
    const fromCourse = (courseCategories ?? []).find((c) => String(c.slug) === 'hands-on-classes')?.id;
    return fromCourse ? Number(fromCourse) : null;
  }, [courseCategories]);

  const deriveWorkshopBucketSlug = (workshop) => {
    const ids = (workshop?.category_ids ?? []).map((n) => String(n));
    const slugs = ids.map((id) => workshopCategoryById.get(id)?.slug).filter(Boolean);
    const joined = `${workshop?.title ?? ''} ${workshop?.summary ?? ''} ${workshop?.content ?? ''} ${slugs.join(' ')}`.toLowerCase();
    if (slugs.includes('e-book') || joined.includes('e-book') || joined.includes('ebook') || joined.includes('e book')) return 'e-book';
    if (
      slugs.includes('recorded-live-workshop') ||
      joined.includes('recorded') ||
      joined.includes('pre-recorded') ||
      joined.includes('pre recorded') ||
      joined.includes('recording')
    )
      return 'recorded-live-workshop';
    return 'upcoming-live-workshops';
  };

  const submitCourse = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      const categoryIds = (courseForm.category_ids ?? [])
        .map((value) => Number(value))
        .filter((n) => Number.isFinite(n) && n > 0);
      const forcedCategoryIds = handsOnCategoryId ? Array.from(new Set([...categoryIds, Number(handsOnCategoryId)])) : categoryIds;
      const payload = {
        kind: 'workshop',
        title: courseForm.title,
        summary: courseForm.summary || null,
        content: courseForm.content || null,
        featured_image_url: courseForm.featured_image_url || null,
        category_ids: forcedCategoryIds,
        price: courseForm.price_inr
          ? {
              currency: String(courseForm.currency || 'INR').trim().toUpperCase(),
              amount_cents: Number(courseForm.price_inr) * 100,
              compare_at_amount_cents: courseForm.compare_at_inr ? Number(courseForm.compare_at_inr) * 100 : null,
              sale_amount_cents: courseForm.sale_price_inr ? Number(courseForm.sale_price_inr) * 100 : null,
              sale_starts_at: courseForm.sale_starts_at || null,
              sale_ends_at: courseForm.sale_ends_at || null,
            }
          : null,
        publish_at: courseForm.publish_at || null,
        qa_enabled: Boolean(courseForm.qa_enabled),
        is_published: Boolean(courseForm.is_published),
      };
      if (editingCourseId) {
        await api.admin.courses.update(token, editingCourseId, payload);
        setMessage('Hands-on class updated.');
        setEditingCourseId(null);
      } else {
        await api.admin.courses.create(token, {
          ...payload,
          scheduled_at: courseForm.scheduled_at || null,
          zoom_meeting_id: courseForm.zoom_meeting_id || null,
          zoom_join_url: courseForm.zoom_join_url || null,
        });
        setMessage('Hands-on class created.');
      }
      setCourseForm({
        title: '',
        summary: '',
        content: '',
        featured_image_url: '',
        currency: 'INR',
        price_inr: '',
        compare_at_inr: '',
        sale_price_inr: '',
        sale_starts_at: '',
        sale_ends_at: '',
        category_ids: [],
        scheduled_at: '',
        zoom_meeting_id: '',
        zoom_join_url: '',
        publish_at: '',
        qa_enabled: true,
        is_published: true,
      });
      await loadTabData('courses');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to save hands-on class');
    } finally {
      setStatus('idle');
    }
  };

  const loadCourseProgress = async (courseId) => {
    if (!token || !courseId) return;
    setCourseProgressStatus('loading');
    setCourseProgressError('');
    try {
      const data = await api.admin.courses.progress(token, courseId);
      setCourseProgress(data ?? null);
      setCourseProgressStatus('idle');
    } catch (err) {
      setCourseProgress(null);
      setCourseProgressStatus('error');
      setCourseProgressError(err?.message ?? 'Failed to load course progress');
    }
  };

  const beginCourseEdit = (course) => {
    setEditingCourseId(course.id);
    setCourseForm({
      title: course.title ?? '',
      summary: course.summary ?? '',
      content: course.content ?? '',
      featured_image_url: course.featured_image_url ?? '',
      currency: String(course.currency ?? 'INR').trim().toUpperCase(),
      price_inr: course.amount_cents ? String(Math.round(course.amount_cents / 100)) : '',
      compare_at_inr: course.compare_at_amount_cents ? String(Math.round(course.compare_at_amount_cents / 100)) : '',
      sale_price_inr: course.sale_amount_cents ? String(Math.round(course.sale_amount_cents / 100)) : '',
      sale_starts_at: course.sale_starts_at ? String(course.sale_starts_at) : '',
      sale_ends_at: course.sale_ends_at ? String(course.sale_ends_at) : '',
      category_ids: Array.isArray(course.category_ids) ? course.category_ids : [],
      scheduled_at: '',
      zoom_meeting_id: '',
      zoom_join_url: '',
      publish_at: course.publish_at ? String(course.publish_at) : '',
      qa_enabled: course.qa_enabled == null ? true : Boolean(course.qa_enabled),
      is_published: Boolean(course.is_published),
    });
    setTab('courses');
  };

  const cancelCourseEdit = () => {
    setEditingCourseId(null);
    setCourseForm({
      title: '',
      summary: '',
      content: '',
      featured_image_url: '',
      currency: 'INR',
      price_inr: '',
      compare_at_inr: '',
      sale_price_inr: '',
      sale_starts_at: '',
      sale_ends_at: '',
      category_ids: [],
      scheduled_at: '',
      zoom_meeting_id: '',
      zoom_join_url: '',
      publish_at: '',
      qa_enabled: true,
      is_published: true,
    });
  };

  const removeCourse = async (id) => {
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.courses.remove(token, id);
      setMessage('Course deleted.');
      await loadTabData('courses');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to delete course');
    } finally {
      setStatus('idle');
    }
  };

  const submitWorkshop = async (e) => {
    e.preventDefault();
    if (!token) {
      setMessage('Unauthorized. Please sign in as an admin to create workshops.');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const categoryIds = (workshopForm.category_ids ?? [])
        .map((value) => Number(value))
        .filter((n) => Number.isFinite(n) && n > 0);
      const payload = {
        kind: 'workshop',
        title: workshopForm.title,
        summary: workshopForm.summary || null,
        content: workshopForm.content || null,
        featured_image_url: workshopForm.featured_image_url || null,
        category_ids: categoryIds,
        price: workshopForm.price_inr
          ? {
              currency: String(workshopForm.currency || 'INR').trim().toUpperCase(),
              amount_cents: Number(workshopForm.price_inr) * 100,
              compare_at_amount_cents: workshopForm.compare_at_inr ? Number(workshopForm.compare_at_inr) * 100 : null,
              sale_amount_cents: workshopForm.sale_price_inr ? Number(workshopForm.sale_price_inr) * 100 : null,
              sale_starts_at: workshopForm.sale_starts_at || null,
              sale_ends_at: workshopForm.sale_ends_at || null,
            }
          : null,
        publish_at: workshopForm.publish_at || null,
        qa_enabled: Boolean(workshopForm.qa_enabled),
        is_published: Boolean(workshopForm.is_published),
      };
      if (editingWorkshopId) {
        await api.admin.courses.update(token, editingWorkshopId, payload);
        setMessage('Workshop updated.');
        setEditingWorkshopId(null);
      } else {
        await api.admin.courses.create(token, {
          ...payload,
          scheduled_at: workshopForm.scheduled_at || null,
          zoom_meeting_id: workshopForm.zoom_meeting_id || null,
          zoom_join_url: workshopForm.zoom_join_url || null,
        });
        setMessage('Workshop created.');
      }
      setWorkshopForm({
        title: '',
        summary: '',
        content: '',
        featured_image_url: '',
        currency: 'INR',
        price_inr: '',
        compare_at_inr: '',
        sale_price_inr: '',
        sale_starts_at: '',
        sale_ends_at: '',
        category_ids: [],
        scheduled_at: '',
        zoom_meeting_id: '',
        zoom_join_url: '',
        publish_at: '',
        qa_enabled: true,
        is_published: true,
      });
      await loadTabData('workshops');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to save workshop');
    } finally {
      setStatus('idle');
    }
  };

  const addWorkshopCategory = (categoryId) => {
    const nextId = String(categoryId ?? '').trim();
    if (!nextId) return;
    setWorkshopForm((state) => ({
      ...state,
      category_ids: Array.from(new Set([...(state.category_ids ?? []).map((value) => String(value)), nextId])),
    }));
  };

  const removeWorkshopCategory = (categoryId) => {
    const nextId = String(categoryId ?? '').trim();
    if (!nextId) return;
    setWorkshopForm((state) => ({
      ...state,
      category_ids: (state.category_ids ?? []).filter((value) => String(value) !== nextId),
    }));
  };

	  const beginWorkshopEdit = (workshop) => {
	    if (workshop?.__offline) {
	      setEditingWorkshopId(null);
	      setMessage('Offline workshop loaded. Saving will create a new workshop record.');
	    } else {
	      setEditingWorkshopId(workshop.id);
	    }
	    setWorkshopForm({
	      title: workshop.title ?? '',
	      summary: workshop.summary ?? '',
	      content: workshop.content ?? '',
	      featured_image_url: workshop.featured_image_url ?? '',
      currency: String(workshop.currency ?? 'INR').trim().toUpperCase(),
      price_inr: workshop.amount_cents ? String(Math.round(workshop.amount_cents / 100)) : '',
      compare_at_inr: workshop.compare_at_amount_cents ? String(Math.round(workshop.compare_at_amount_cents / 100)) : '',
      sale_price_inr: workshop.sale_amount_cents ? String(Math.round(workshop.sale_amount_cents / 100)) : '',
      sale_starts_at: workshop.sale_starts_at ? String(workshop.sale_starts_at) : '',
      sale_ends_at: workshop.sale_ends_at ? String(workshop.sale_ends_at) : '',
      category_ids: Array.isArray(workshop.category_ids) ? workshop.category_ids : [],
      scheduled_at: '',
      zoom_meeting_id: '',
      zoom_join_url: '',
      publish_at: workshop.publish_at ? String(workshop.publish_at) : '',
	      qa_enabled: workshop.qa_enabled == null ? true : Boolean(workshop.qa_enabled),
	      is_published: Boolean(workshop.is_published),
	    });
	    setTab('workshops');
	  };

  const cancelWorkshopEdit = () => {
    setEditingWorkshopId(null);
    setWorkshopForm({
      title: '',
      summary: '',
      content: '',
      featured_image_url: '',
      currency: 'INR',
      price_inr: '',
      compare_at_inr: '',
      sale_price_inr: '',
      sale_starts_at: '',
      sale_ends_at: '',
      category_ids: [],
      scheduled_at: '',
      zoom_meeting_id: '',
      zoom_join_url: '',
      publish_at: '',
      qa_enabled: true,
      is_published: true,
    });
  };

  const removeWorkshop = async (id) => {
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.courses.remove(token, id);
      setMessage('Workshop deleted.');
      await loadTabData('workshops');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to delete workshop');
    } finally {
      setStatus('idle');
    }
  };

  const exportAllUsers = async () => {
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      const data = await api.admin.users.list(token, { limit: 50000, offset: 0 });
      const list = data?.users ?? [];
      downloadCsv({
        filename: `users_${new Date().toISOString().slice(0, 10)}.csv`,
        headers: ['id', 'name', 'email', 'role', 'created_at'],
        rows: list.map((u) => [u.id, u.name ?? '', u.email ?? '', u.role ?? '', u.created_at ?? '']),
      });
      setMessage(`Exported ${list.length} users.`);
    } catch (err) {
      setMessage(err?.message ?? 'Failed to export users');
    } finally {
      setStatus('idle');
    }
  };

  const impersonateFromAdmin = async (targetUser) => {
    if (!token || !targetUser?.id) return;
    const label = `${String(targetUser.email ?? targetUser.name ?? targetUser.id)} (${String(targetUser.role ?? 'user')})`;
    const ok = typeof window !== 'undefined' ? window.confirm(`Switch to: ${label}?\n\nYou can return to admin from the navbar.`) : true;
    if (!ok) return;
    setStatus('loading');
    setMessage('');
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('lf:return_admin', JSON.stringify({ token, user }));
      }
      const data = await api.admin.users.impersonate(token, targetUser.id);
      setSession({ token: data?.token, user: data?.user });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (typeof window !== 'undefined') sessionStorage.removeItem('lf:return_admin');
      setMessage(err?.message ?? 'Failed to switch user');
    } finally {
      setStatus('idle');
    }
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.categories.create(token, {
        type: categoryForm.type,
        name: categoryForm.name,
        slug: categoryForm.slug || null,
        description: categoryForm.description || null,
      });
      setMessage('Category created.');
      setCategoryForm({ type: categoryForm.type, name: '', slug: '', description: '' });
      await loadTabData('categories');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to create category');
    } finally {
      setStatus('idle');
    }
  };

  const removeCategory = async (id) => {
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.categories.remove(token, id);
      setMessage('Category deleted.');
      await loadTabData('categories');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to delete category');
    } finally {
      setStatus('idle');
    }
  };

  const addCategoryInline = async (type, payload) => {
    if (!token) return null;
    setStatus('loading');
    setMessage('');
    try {
      const created = await api.admin.categories.create(token, {
        type,
        name: payload.name,
        slug: payload.slug || null,
        description: payload.description || null,
      });
      setMessage('Category created.');
      const cats = await api.admin.categories.list(token, type);
      const list = cats.categories ?? [];
      if (type === 'course') setCourseCategories(list);
      if (type === 'recipe') setRecipeCategories(list);
      if (type === 'workshop') setWorkshopCategories(list);
      return { list, createdId: created?.category?.id ?? null };
    } catch (err) {
      setMessage(err?.message ?? 'Failed to create category');
      return null;
    } finally {
      setStatus('idle');
    }
  };

  const submitRecipe = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      const categoryIds = (recipeForm.category_ids ?? [])
        .map((value) => Number(value))
        .filter((n) => Number.isFinite(n) && n > 0);
      const tagIds = (recipeForm.tag_ids ?? [])
        .map((value) => Number(value))
        .filter((n) => Number.isFinite(n) && n > 0);
      const payload = {
        title: recipeForm.title,
        summary: recipeForm.summary || null,
        featured_image_url: recipeForm.featured_image_url || null,
        content: recipeForm.content || null,
        description: recipeForm.description || null,
        ingredients: recipeForm.ingredients || null,
        instructions: recipeForm.instructions || null,
        notes: recipeForm.notes || null,
        category_ids: categoryIds,
        tag_ids: tagIds,
        is_published: Boolean(recipeForm.is_published),
        publish_at: recipeForm.publish_at || null,
      };
      if (editingRecipeId) {
        await api.admin.recipes.update(token, editingRecipeId, payload);
        setMessage('Recipe updated.');
        setEditingRecipeId(null);
      } else {
        await api.admin.recipes.create(token, payload);
        setMessage('Recipe created.');
      }
      setRecipeForm({ title: '', summary: '', featured_image_url: '', content: '', description: '', ingredients: '', instructions: '', notes: '', category_ids: [], tag_ids: [], publish_at: '', is_published: true });
      await loadTabData('recipes');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to save recipe');
    } finally {
      setStatus('idle');
    }
  };

	  const beginRecipeEdit = (recipe) => {
	    if (recipe?.__offline) {
	      setEditingRecipeId(null);
	      setMessage('Offline recipe loaded. Saving will create a new recipe record.');
	    } else {
	      setEditingRecipeId(recipe.id);
	    }
	    const ids = (recipe?.category_ids ?? recipe?.categories ?? [])
	      .map((c) => (typeof c === 'number' ? c : c?.id))
	      .filter(Boolean)
	      .map((n) => String(n));
    setRecipeForm({
      title: recipe.title ?? '',
      summary: recipe.summary ?? '',
      featured_image_url: recipe.featured_image_url ?? '',
      content: recipe.content ?? '',
      description: recipe.description ?? recipe.summary ?? '',
      ingredients: recipe.ingredients ?? '',
      instructions: recipe.instructions ?? '',
      notes: recipe.notes ?? '',
      category_ids: ids,
      tag_ids: (recipe?.tag_ids ?? []).map((n) => String(n)),
      publish_at: recipe?.publish_at ? String(recipe.publish_at) : '',
      is_published: Boolean(recipe.is_published),
    });
    setTab('recipes');
  };

  const cancelRecipeEdit = () => {
    setEditingRecipeId(null);
    setRecipeForm({ title: '', summary: '', featured_image_url: '', content: '', description: '', ingredients: '', instructions: '', notes: '', category_ids: [], tag_ids: [], publish_at: '', is_published: true });
  };

  const deleteRecipe = async (id) => {
    if (!token) return;
    if (!id) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.recipes.remove(token, id);
      setMessage('Recipe deleted.');
      await loadTabData('recipes');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to delete recipe');
    } finally {
      setStatus('idle');
    }
  };

  const openOrder = async (orderId) => {
    if (!token || !orderId) return;
    setSelectedOrder(orderId);
    setOrderDetail(null);
    setStatus('loading');
    setMessage('');
    try {
      const data = await api.admin.orders.get(token, orderId);
      setOrderDetail(data);
    } catch (err) {
      setMessage(err?.message ?? 'Failed to load order');
    } finally {
      setStatus('idle');
    }
  };

  const markOrderPaid = async (orderId) => {
    if (!token || !orderId) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.orders.update(token, orderId, { status: 'paid' });
      setMessage('Order marked as paid.');
      await loadTabData('orders');
      await openOrder(orderId);
    } catch (err) {
      setMessage(err?.message ?? 'Failed to update order');
    } finally {
      setStatus('idle');
    }
  };

  const refundOrder = async (orderId) => {
    if (!token || !orderId) return;
    const amount = window.prompt('Refund amount (in cents). Leave empty to refund full amount:');
    if (amount === null) return;
    const amountCents = amount.trim() ? Number(amount.trim()) : null;
    setStatus('loading');
    setMessage('');
    try {
      const total = Number(orderDetail?.order?.total_cents ?? orderDetail?.order?.total_cents ?? 0);
      await api.admin.orders.refund(token, orderId, { amount_cents: amountCents && amountCents > 0 ? amountCents : total, reason: null });
      setMessage('Refund processed.');
      await loadTabData('orders');
      await openOrder(orderId);
    } catch (err) {
      setMessage(err?.message ?? 'Failed to refund order');
    } finally {
      setStatus('idle');
    }
  };

  const reconcileOrder = async (orderId) => {
    if (!token || !orderId) return;
    const ok = typeof window === 'undefined' ? true : window.confirm(`Reconcile order #${orderId} with the payment gateway?`);
    if (!ok) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.orders.reconcile(token, orderId);
      setMessage('Reconciliation triggered.');
      await loadTabData('orders');
      await openOrder(orderId);
    } catch (err) {
      setMessage(err?.message ?? 'Failed to reconcile order');
    } finally {
      setStatus('idle');
    }
  };

  const downloadInvoice = async (orderId) => {
    if (!token || !orderId) return;
    setStatus('loading');
    setMessage('');
    try {
      const blob = await api.admin.orders.invoice(token, orderId);
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${orderId}.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setMessage(err?.message ?? 'Failed to download invoice');
    } finally {
      setStatus('idle');
    }
  };

  const submitCoupon = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      if (!token) {
        await refreshProfile();
      }
      const authToken = useAuthStore.getState().token;
      if (!authToken) throw new Error('Unauthorized');
      const discountValueInr = couponForm.discount_value_inr ? Number(couponForm.discount_value_inr) : null;
      const minOrderInr = couponForm.min_order_total_inr ? Number(couponForm.min_order_total_inr) : null;

      const normalizeDatetime = (value) => {
        const raw = String(value ?? '').trim();
        if (!raw) return null;
        const dt = new Date(raw);
        if (Number.isNaN(dt.getTime())) {
          throw new Error('Invalid coupon date/time. Please re-select Starts/Ends.');
        }
        return dt.toISOString();
      };

      if (couponForm.discount_type === 'amount' && !(discountValueInr != null && Number.isFinite(discountValueInr) && discountValueInr > 0)) {
        throw new Error('Discount value is required for amount coupons.');
      }
      if (couponForm.discount_type === 'percent') {
        const pct = couponForm.discount_percent ? Number(couponForm.discount_percent) : null;
        if (!(pct != null && Number.isFinite(pct) && pct > 0 && pct <= 100)) {
          throw new Error('Discount percent must be between 1 and 100.');
        }
      }

      const payload = {
        code: couponForm.code,
        description: couponForm.description || null,
        discount_type: couponForm.discount_type,
        discount_value_cents:
          couponForm.discount_type === 'amount' && discountValueInr != null && Number.isFinite(discountValueInr)
            ? Math.round(discountValueInr * 100)
            : null,
        discount_percent: couponForm.discount_percent ? Number(couponForm.discount_percent) : null,
        currency: couponForm.currency || 'INR',
        max_redemptions: couponForm.max_redemptions ? Number(couponForm.max_redemptions) : null,
        max_redemptions_per_user: couponForm.max_redemptions_per_user ? Number(couponForm.max_redemptions_per_user) : null,
        min_order_total_cents: minOrderInr != null && Number.isFinite(minOrderInr) ? Math.round(minOrderInr * 100) : null,
        starts_at: normalizeDatetime(couponForm.starts_at),
        ends_at: normalizeDatetime(couponForm.ends_at),
        is_active: Boolean(couponForm.is_active),
      };
      if (editingCouponId) {
        await api.admin.coupons.update(authToken, editingCouponId, payload);
        setMessage('Coupon updated.');
        setEditingCouponId(null);
      } else {
        await api.admin.coupons.create(authToken, payload);
        setMessage('Coupon created.');
      }
      setCouponForm({
        code: '',
        description: '',
        discount_type: 'amount',
        discount_value_inr: '',
        discount_percent: '',
        currency: 'INR',
        max_redemptions: '',
        max_redemptions_per_user: '',
        min_order_total_inr: '',
        starts_at: '',
        ends_at: '',
        is_active: true,
      });
      await loadTabData('coupons');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to save coupon');
    } finally {
      setStatus('idle');
    }
  };

  const beginCouponEdit = (coupon) => {
    setEditingCouponId(coupon.id);
    setCouponForm({
      code: coupon.code ?? '',
      description: coupon.description ?? '',
      discount_type: coupon.discount_type ?? 'amount',
      discount_value_inr:
        coupon.discount_value_cents != null ? String(Math.round(Number(coupon.discount_value_cents) / 100)) : '',
      discount_percent: coupon.discount_percent != null ? String(coupon.discount_percent) : '',
      currency: 'INR',
      max_redemptions: coupon.max_redemptions != null ? String(coupon.max_redemptions) : '',
      max_redemptions_per_user: coupon.max_redemptions_per_user != null ? String(coupon.max_redemptions_per_user) : '',
      min_order_total_inr:
        coupon.min_order_total_cents != null ? String(Math.round(Number(coupon.min_order_total_cents) / 100)) : '',
      starts_at: coupon.starts_at ? String(coupon.starts_at) : '',
      ends_at: coupon.ends_at ? String(coupon.ends_at) : '',
      is_active: Boolean(coupon.is_active),
    });
    setTab('coupons');
  };

  const cancelCouponEdit = () => {
    setEditingCouponId(null);
    setCouponForm({
      code: '',
      description: '',
      discount_type: 'amount',
      discount_value_inr: '',
      discount_percent: '',
      currency: 'INR',
      max_redemptions: '',
      max_redemptions_per_user: '',
      min_order_total_inr: '',
      starts_at: '',
      ends_at: '',
      is_active: true,
    });
  };

  const deleteCoupon = async (id) => {
    if (!token || !id) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.coupons.remove(token, id);
      setMessage('Coupon deleted.');
      await loadTabData('coupons');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to delete coupon');
    } finally {
      setStatus('idle');
    }
  };

  const submitSession = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      const payload = {
        course_id: Number(sessionForm.course_id),
        title: sessionForm.title || null,
        scheduled_at: sessionForm.scheduled_at,
        status: sessionForm.status,
        zoom_meeting_id: sessionForm.zoom_meeting_id || null,
        zoom_join_url: sessionForm.zoom_join_url || null,
      };
      if (editingSessionId) {
        await api.admin.liveSessions.update(token, editingSessionId, payload);
        setMessage('Live session updated.');
        setEditingSessionId(null);
      } else {
        await api.admin.liveSessions.create(token, payload);
        setMessage('Live session created.');
      }
      setSessionForm({ course_id: '', title: '', scheduled_at: '', status: 'upcoming', zoom_meeting_id: '', zoom_join_url: '' });
      await loadTabData('sessions');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to save live session');
    } finally {
      setStatus('idle');
    }
  };

  const beginSessionEdit = (session) => {
    setEditingSessionId(session.id);
    setSessionForm({
      course_id: String(session.course_id ?? ''),
      title: session.title ?? '',
      scheduled_at: session.scheduled_at ? String(session.scheduled_at).replace(' ', 'T') : '',
      status: session.status ?? 'upcoming',
      zoom_meeting_id: session.zoom_meeting_id ?? '',
      zoom_join_url: session.zoom_join_url ?? '',
    });
    setTab('sessions');
  };

  const cancelSessionEdit = () => {
    setEditingSessionId(null);
    setSessionForm({ course_id: '', title: '', scheduled_at: '', status: 'upcoming', zoom_meeting_id: '', zoom_join_url: '' });
  };

  const deleteSession = async (id) => {
    if (!token) return;
    if (!id) return;
    if (typeof window !== 'undefined' && !window.confirm('Delete this live session?')) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.liveSessions.remove(token, id);
      setMessage('Live session deleted.');
      await loadTabData('sessions');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to delete live session');
    } finally {
      setStatus('idle');
    }
  };

  const submitRecording = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      const payload = {
        live_session_id: Number(recordingForm.live_session_id),
        course_id: Number(recordingForm.course_id),
        recording_url: recordingForm.recording_url,
        provider: recordingForm.provider || null,
        recorded_at: recordingForm.recorded_at || null,
        duration_seconds: recordingForm.duration_seconds ? Number(recordingForm.duration_seconds) : null,
      };
      if (editingRecordingId) {
        await api.admin.recordings.update(token, editingRecordingId, payload);
        setMessage('Recording updated.');
        setEditingRecordingId(null);
      } else {
        await api.admin.recordings.create(token, payload);
        setMessage('Recording added.');
      }
      setRecordingForm({ live_session_id: '', course_id: '', recording_url: '', provider: '', recorded_at: '', duration_seconds: '' });
      await loadTabData('recordings');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to add recording');
    } finally {
      setStatus('idle');
    }
  };

  const beginRecordingEdit = (rec) => {
    setEditingRecordingId(rec.id);
    setRecordingForm({
      live_session_id: String(rec.live_session_id ?? ''),
      course_id: String(rec.course_id ?? ''),
      recording_url: String(rec.recording_url ?? ''),
      provider: String(rec.provider ?? ''),
      recorded_at: rec.recorded_at ? String(rec.recorded_at).replace(' ', 'T') : '',
      duration_seconds: rec.duration_seconds ? String(rec.duration_seconds) : '',
    });
    setTab('recordings');
  };

  const cancelRecordingEdit = () => {
    setEditingRecordingId(null);
    setRecordingForm({ live_session_id: '', course_id: '', recording_url: '', provider: '', recorded_at: '', duration_seconds: '' });
  };

  const submitEnrollment = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.enrollments.create(token, {
        user_id: Number(enrollForm.user_id),
        course_id: Number(enrollForm.course_id),
        expiry_date: enrollForm.expiry_date || null,
      });
      setMessage('Enrollment created.');
      setEnrollForm({ user_id: '', course_id: '', expiry_date: getDefaultDateInputValue(1) });
      await loadTabData('enrollments');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to enroll user');
    } finally {
      setStatus('idle');
    }
  };

  const removeEnrollment = async (id) => {
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.enrollments.remove(token, id);
      setMessage('Enrollment removed.');
      await loadTabData('enrollments');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to remove enrollment');
    } finally {
      setStatus('idle');
    }
  };

  const exportEnrollmentsListCsv = () => {
    downloadCsv({
      filename: `enrollments_${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ['enrollment_id', 'user_id', 'user_email', 'course_id', 'course_title', 'status', 'expiry_date', 'enrolled_at'],
      rows: (enrollments ?? []).map((e) => [
        e.id,
        e.user_id,
        e.user_email,
        e.course_id,
        e.course_title,
        e.status,
        e.expiry_date,
        e.enrolled_at,
      ]),
    });
  };

  const extendEnrollment = async (enrollment) => {
    if (!token || !enrollment?.id) return;
    const next = typeof window !== 'undefined' ? window.prompt('New expiry date (YYYY-MM-DD):', String(enrollment.expiry_date ?? '')) : null;
    if (!next) return;
    setStatus('loading');
    setMessage('');
    try {
      await api.admin.enrollments.patch(token, enrollment.id, { expiry_date: next });
      setMessage('Enrollment updated.');
      await loadTabData('enrollments');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to update enrollment');
    } finally {
      setStatus('idle');
    }
  };

  const createAdmin = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const data = await api.admin.createAdmin(token, adminForm);
      setMessage(`Created admin: ${data.user.email}`);
      setAdminForm({ name: '', email: '', password: '' });
      await loadTabData('admins');
    } catch (err) {
      setMessage(err?.message ?? 'Failed to create admin');
    } finally {
      setStatus('idle');
    }
  };

  const activeTabLabel = useMemo(() => tabs.find((t) => t.id === tab)?.label ?? 'Overview', [tab]);

  const initials = useMemo(() => {
    const safe = String(user?.name ?? user?.email ?? '').trim();
    if (!safe) return 'A';
    const parts = safe.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? 'A';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return `${first}${last}`.toUpperCase();
  }, [user?.name, user?.email]);

  return (
    <main className="section admin-page">
      <div className="container admin-dashboard">
        <div className="admin-layout">
          <aside className="panel admin-sidebar">
            <div className="admin-sidebar-brand">
              <div className="admin-avatar" aria-hidden="true">
                {initials}
              </div>
              <div>
                <div className="admin-name">{user?.name ?? 'Admin'}</div>
                <div className="muted admin-email">{user?.email ?? ''}</div>
              </div>
            </div>

            <div className="admin-sidebar-body">
              <p className="section-kicker">Dashboard</p>
              {!token ? <p className="form-error" style={{ marginTop: 10 }}>Login as an admin to access this page.</p> : null}
              {!isAdmin && token ? <p className="form-error" style={{ marginTop: 10 }}>Your account is not an admin.</p> : null}
              <div role="tablist" aria-label="Admin sections" className="admin-nav">
                {visibleTabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`admin-nav-link${tab === t.id ? ' is-active' : ''}`}
                    onClick={() => onTab(t.id)}
                    disabled={!token || !isAdmin}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="admin-main">
            <div className="panel admin-topbar">
              <div className="admin-topbar-left">
                <div>
                  <div className="h3" style={{ margin: 0 }}>{activeTabLabel}</div>
                </div>
              </div>
              <div className="admin-topbar-right">
                {tab === 'overview' ? (
                  <div className="admin-range" role="group" aria-label="Date range">
                    <DateRangePicker
                      compact
                      from={overviewDisplayFrom}
                      to={overviewDisplayTo}
                      onChange={({ from, to }) => {
                        const nextFrom = from;
                        const nextTo = to || from;
                        applyOverviewRangeFromTopbar({ from: nextFrom, to: nextTo });
                      }}
                    />
                  </div>
                ) : null}
                {typeof __BUILD_SHA__ !== 'undefined' && __BUILD_SHA__ ? (
                  <div className="muted" style={{ fontSize: 12, marginRight: 10, whiteSpace: 'nowrap' }}>
                    Build: {String(__BUILD_SHA__).slice(0, 7)}
                  </div>
                ) : null}
                {user ? (
                  <div className="admin-user-pill">
                    <div className="admin-pill-avatar" aria-hidden="true">
                      {initials}
                    </div>
                    <div className="admin-pill-meta">
                      <div className="admin-pill-email">{user?.email ?? ''}</div>
                      <div className="muted admin-pill-role">{user?.role ?? ''}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="panel admin-shell" style={{ marginTop: 16 }}>

          {tab === 'overview' ? (
            <div className="admin-panel">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="button button-solid"
                  type="button"
                  onClick={() => loadTabData('overview')}
                  disabled={disabled || !token || !isAdmin}
                >
                  {overviewStatus === 'loading' ? 'Loading…' : 'Refresh'}
                </button>
	                <button className="button button-ghost" type="button" onClick={checkDashboard} disabled={disabled || !token || !isAdmin}>
	                  {disabled ? 'Checking…' : 'Check admin access'}
	                </button>
	                <Link className="button button-ghost" to="/admin/analytics">
	                  Open analytics dashboard
	                </Link>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    className={`button button-ghost${overviewRange === 'today' ? ' button-solid' : ''}`}
                    type="button"
                    onClick={() => setOverviewRange('today')}
                    disabled={overviewStatus === 'loading'}
                  >
                    Today
                  </button>
                  <button
                    className={`button button-ghost${overviewRange === 'last_7' ? ' button-solid' : ''}`}
                    type="button"
                    onClick={() => setOverviewRange('last_7')}
                    disabled={overviewStatus === 'loading'}
                  >
                    Last 7 days
                  </button>
                  <button
                    className={`button button-ghost${overviewRange === 'last_30' ? ' button-solid' : ''}`}
                    type="button"
                    onClick={() => setOverviewRange('last_30')}
                    disabled={overviewStatus === 'loading'}
                  >
                    Last 30 days
                  </button>
                  <button
                    className={`button button-ghost${overviewRange === 'custom' ? ' button-solid' : ''}`}
                    type="button"
                    onClick={() => setOverviewRange('custom')}
                    disabled={overviewStatus === 'loading'}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {overviewRange === 'custom' ? (
                <div className="admin-split" style={{ marginTop: 12, alignItems: 'flex-end' }}>
                  <label className="field" style={{ margin: 0 }}>
                    <span className="field-label">From</span>
                    <input className="input" type="date" value={overviewFrom} onChange={(e) => setOverviewFrom(e.target.value)} />
                  </label>
                  <label className="field" style={{ margin: 0 }}>
                    <span className="field-label">To</span>
                    <input className="input" type="date" value={overviewTo} onChange={(e) => setOverviewTo(e.target.value)} />
                  </label>
                  <button
                    className="button button-solid"
                    type="button"
                    onClick={() => setCustomRangeNonce((n) => n + 1)}
                    disabled={overviewStatus === 'loading' || !overviewFrom || !overviewTo}
                  >
                    Apply
                  </button>
                </div>
              ) : null}

              {overviewError ? <p className="form-error" style={{ marginTop: 12 }}>{overviewError}</p> : null}
              {systemError ? <p className="form-error" style={{ marginTop: 12 }}>{systemError}</p> : null}

              <div className="panel" style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <div className="h4" style={{ margin: 0 }}>System status</div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {systemStatus === 'loading' ? 'Checking dependencies…' : systemHealth?.ok ? 'All systems operational.' : 'Attention needed.'}
                    </div>
                  </div>
                  <button className="button button-ghost" type="button" onClick={() => loadTabData('overview')} disabled={disabled}>
                    Refresh
                  </button>
                </div>

                <div className="admin-metrics-grid" style={{ marginTop: 12 }}>
                  <div className="admin-metric-card">
                    <div className="muted">Database</div>
                    <div className="admin-metric-value" style={{ fontSize: '1.1rem' }}>
                      {systemHealth?.checks?.db?.ok ? 'OK' : 'Down'}
                    </div>
                    <div className="muted">{systemHealth?.checks?.db?.latency_ms != null ? `${systemHealth.checks.db.latency_ms}ms` : '—'}</div>
                  </div>
                  <div className="admin-metric-card">
                    <div className="muted">Redis</div>
                    <div className="admin-metric-value" style={{ fontSize: '1.1rem' }}>
                      {systemHealth?.checks?.redis?.enabled === false ? 'Off' : systemHealth?.checks?.redis?.ok ? 'OK' : 'Down'}
                    </div>
                    <div className="muted">
                      {systemHealth?.checks?.redis?.enabled === false ? 'Not enabled' : systemHealth?.checks?.redis?.latency_ms != null ? `${systemHealth.checks.redis.latency_ms}ms` : '—'}
                    </div>
                  </div>
                  <div className="admin-metric-card">
                    <div className="muted">Worker</div>
                    <div className="admin-metric-value" style={{ fontSize: '1.1rem' }}>
                      {systemHealth?.checks?.worker?.ok ? 'OK' : 'Stale'}
                    </div>
                    <div className="muted">
                      {systemHealth?.checks?.worker?.last_heartbeat_ms_ago != null ? `${Math.round(systemHealth.checks.worker.last_heartbeat_ms_ago / 1000)}s ago` : '—'}
                    </div>
                  </div>
                  <div className="admin-metric-card">
                    <div className="muted">Email queue</div>
                    <div className="admin-metric-value" style={{ fontSize: '1.1rem' }}>
                      {systemMetrics?.queue?.email_outbox ? 'OK' : '—'}
                    </div>
                    <div className="muted">
                      {systemMetrics?.queue?.email_outbox
                        ? `${systemMetrics.queue.email_outbox.pending} pending · ${systemMetrics.queue.email_outbox.failed} failed`
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {analytics ? (
                <>
                  <div className="admin-metrics-grid" style={{ marginTop: 14 }}>
                    <div className="admin-metric-card">
                      <div className="muted">Total revenue</div>
                      <div className="admin-metric-value">
                        {formatMoney(revTotals?.total_sales_cents ?? analytics?.revenue?.total_revenue_cents, 'INR')}
                      </div>
                    </div>
                    <div className="admin-metric-card">
                      <div className="muted">Monthly revenue</div>
                      <div className="admin-metric-value">
                        {formatMoney(monthlyRevenueForRangeCents || analytics?.revenue?.revenue_month_cents, 'INR')}
                      </div>
                    </div>
                    <div className="admin-metric-card">
                      <div className="muted">New enrolments</div>
                      <div className="admin-metric-value">{Number(enrTotals?.total_enrollments ?? analytics?.enrollments?.new_enrollments_month ?? 0)}</div>
                    </div>
                    <div className="admin-metric-card">
                      <div className="muted">Active students</div>
                      <div className="admin-metric-value">{Number(analytics?.enrollments?.active_students ?? 0)}</div>
                    </div>
                    <div className="admin-metric-card">
                      <div className="muted">Total orders</div>
                      <div className="admin-metric-value">{Number(rangeOrderTotals.total ?? analytics?.orders?.totals?.total_orders ?? 0)}</div>
                    </div>
                  </div>

                  <div className="admin-two-col" style={{ marginTop: 16 }}>
                    <ChartCard
                      title="Daily revenue"
                      subtitle="Revenue captured per day"
                    >
                      <SparklineBarChart
                        data={(revDaily ?? []).map((d) => ({ label: d.day, value: Number(d.revenue_cents ?? 0) }))}
                        valueKey="value"
                        labelKey="label"
                        height={150}
                      />
                    </ChartCard>

                    <ChartCard
                      title="Monthly revenue"
                      subtitle="Revenue captured per month"
                    >
                      <SparklineLineChart
                        data={(revMonthly ?? []).map((m) => ({ label: m.month, value: Number(m.revenue_cents ?? 0) }))}
                        valueKey="value"
                        labelKey="label"
                        height={150}
                      />
                    </ChartCard>
                  </div>

                  <div className="admin-two-col" style={{ marginTop: 16 }}>
                    <ChartCard title="Enrolment trend" subtitle="New enrolments per day">
                      <SparklineLineChart
                        data={(enrDaily ?? []).map((d) => ({ label: d.day, value: Number(d.enrollments ?? 0) }))}
                        valueKey="value"
                        labelKey="label"
                        height={150}
                      />
                    </ChartCard>

                    <ChartCard title="Conversion funnel" subtitle="Visitors → Cart → Checkout → Purchase">
                      <ul className="list" style={{ paddingLeft: 18, marginTop: 8 }}>
                        <li>Visitors: <strong>{Number(funnel?.visitors ?? analytics?.conversion?.visitors ?? 0)}</strong></li>
                        <li>Add to cart: <strong>{Number(funnel?.carts ?? analytics?.conversion?.carts ?? 0)}</strong></li>
                        <li>Checkout: <strong>{Number(funnel?.checkouts ?? analytics?.conversion?.checkouts ?? 0)}</strong></li>
                        <li>Purchase: <strong>{Number(funnel?.purchases ?? analytics?.conversion?.purchases ?? 0)}</strong></li>
                      </ul>
                      <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
                        Visitors → Purchase:{' '}
                        {funnel?.visitors_to_purchase_rate == null ? '—' : `${funnel.visitors_to_purchase_rate}%`}
                      </p>
                    </ChartCard>
                  </div>

                  <div className="admin-two-col" style={{ marginTop: 16 }}>
                    <ChartCard title="Top selling courses" subtitle="By revenue in selected range">
                      <div className="admin-table">
                        <div className="admin-row admin-head">
                          <div>ID</div>
                          <div>Course</div>
                          <div>Revenue</div>
                          <div>Orders</div>
                        </div>
                        {(topCourses ?? []).slice(0, topCoursesLimit).map((row) => (
                          <div key={row.course_id} className="admin-row">
                            <div>{row.course_id}</div>
                            <div className="admin-cell-wrap">{row.title}</div>
                            <div>{formatMoney(row.revenue_cents, 'INR')}</div>
                            <div>{row.orders ?? '—'}</div>
                          </div>
                        ))}
                      </div>
                      {(topCourses ?? []).length > 10 ? (
                        <div className="button-row" style={{ marginTop: 10 }}>
                          <button
                            className="button button-ghost"
                            type="button"
                            onClick={() => setTopCoursesLimit((n) => (n >= 20 ? 10 : 20))}
                          >
                            {topCoursesLimit >= 20 ? 'Show less' : 'Show more'}
                          </button>
                        </div>
                      ) : null}
                      {!(topCourses ?? []).length ? <p className="muted">No sales in this range.</p> : null}
                    </ChartCard>

                    <ChartCard title="WooCommerce orders summary" subtitle="Pending / Completed / Refunded (mapped to internal orders)">
                      <div className="admin-table">
                        <div className="admin-row admin-head">
                          <div>Status</div>
                          <div>Orders</div>
                          <div>Total</div>
                        </div>
                        {(wooSummaryNormalized ?? []).map((row) => (
                          <div key={row.status} className="admin-row">
                            <div>{row.status}</div>
                            <div>{row.orders}</div>
                            <div>{formatMoney(row.total_cents, 'INR')}</div>
                          </div>
                        ))}
                      </div>
                      <p className="muted" style={{ marginBottom: 0 }}>{ordersSummaryRange?.note ?? ''}</p>
                    </ChartCard>
                  </div>
                </>
              ) : (
                <p className="muted" style={{ marginTop: 14 }}>
                  {overviewStatus === 'loading' ? 'Loading analytics…' : 'No analytics loaded yet.'}
                </p>
              )}
            </div>
          ) : null}

          {tab === 'orders' ? (
            <div className="admin-panel">
              <div className="admin-split admin-orders-filters">
                <label className="field">
                  <span className="field-label">Status</span>
                  <select
                    className="input"
                    value={ordersMeta.status}
                    onChange={(e) => setOrdersMeta((s) => ({ ...s, status: e.target.value, page: 1 }))}
                  >
                    <option value="">All</option>
                    <option value="payment_pending">Payment pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Search</span>
                  <div className="admin-search">
                    <span className="admin-search-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path
                          d="M10.6 18.2a7.6 7.6 0 1 1 0-15.2 7.6 7.6 0 0 1 0 15.2Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <path
                          d="M16.2 16.2 21 21"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <input
                      className="input admin-search-input"
                      value={ordersMeta.q}
                      onChange={(e) => setOrdersMeta((s) => ({ ...s, q: e.target.value, page: 1 }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setOrdersMeta((s) => ({ ...s, page: 1 }));
                      }}
                      placeholder="Order id / email / name"
                    />
                    {ordersMeta.q ? (
                      <button
                        className="admin-search-clear"
                        type="button"
                        onClick={() => setOrdersMeta((s) => ({ ...s, q: '', page: 1 }))}
                        aria-label="Clear search"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </label>
              </div>

              {ordersError ? (
                <p className="form-error" role="alert" style={{ marginTop: 0 }}>
                  {ordersError}
                </p>
              ) : null}

              <div className="admin-table admin-orders-table">
                <div className="admin-row admin-head" role="row">
                  <div>ID</div>
                  <div>User</div>
                  <div>Status</div>
                  <div>Total</div>
                  <div>Created</div>
                </div>
                {orders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="admin-row admin-row-button"
                    onClick={() => openOrder(o.id)}
                    disabled={disabled}
                  >
                    <div>{o.id}</div>
                    <div className="admin-cell-wrap">{o.email}</div>
                    <div>{o.status}</div>
                    <div>{formatMoney(o.total_cents, o.currency)}</div>
                    <div className="admin-cell-wrap">{o.created_at ? formatDateTimeStandard(o.created_at) : '—'}</div>
                  </button>
                ))}
              </div>
              {ordersLoading ? <p className="muted">Loading orders…</p> : !orders.length ? <p className="muted">No orders found.</p> : null}

              <div className="admin-pagination" role="navigation" aria-label="Orders pagination">
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => setOrdersMeta((s) => ({ ...s, page: Math.max(1, s.page - 1) }))}
                  disabled={disabled || ordersMeta.page <= 1}
                >
                  Prev
                </button>
                <div className="admin-pagination-meta">
                  <span className="muted">
                    Page <strong>{ordersMeta.page}</strong> of <strong>{Math.max(1, Math.ceil((ordersMeta.total ?? 0) / (ordersMeta.limit ?? 1)))}</strong>
                  </span>
                  <span className="muted">{ordersMeta.total} total</span>
                </div>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => setOrdersMeta((s) => ({ ...s, page: s.page + 1 }))}
                  disabled={disabled || ordersMeta.page * ordersMeta.limit >= ordersMeta.total}
                >
                  Next
                </button>
              </div>

              <div style={{ marginTop: 18 }}>
                <h3 className="h3">Order detail</h3>
                {selectedOrder && orderDetail ? (
                  <div className="panel" style={{ margin: 0 }}>
                    <p className="muted">
                      Order #{orderDetail?.order?.id} · {orderDetail?.order?.status} · {formatMoney(orderDetail?.order?.total_cents, orderDetail?.order?.currency)}
                    </p>
                    <div className="button-row" style={{ marginTop: 12 }}>
                      <button className="button button-solid" type="button" onClick={() => markOrderPaid(selectedOrder)} disabled={disabled}>
                        Mark paid
                      </button>
                      <button className="button" type="button" onClick={() => reconcileOrder(selectedOrder)} disabled={disabled}>
                        Reconcile
                      </button>
                      <button className="button button-ghost" type="button" onClick={() => refundOrder(selectedOrder)} disabled={disabled}>
                        Refund
                      </button>
                      <button className="button" type="button" onClick={() => downloadInvoice(selectedOrder)} disabled={disabled}>
                        Download invoice
                      </button>
                    </div>
                    <h4 className="h4" style={{ marginTop: 16 }}>Items</h4>
                    <ul className="list">
                      {(orderDetail?.items ?? []).map((it) => (
                        <li key={it.id}>
                          <strong>{it.title}</strong> <span className="muted">× {it.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    <h4 className="h4" style={{ marginTop: 16 }}>Payments</h4>
                    <ul className="list">
                      {(orderDetail?.payments ?? []).map((p) => (
                        <li key={p.id}>
                          <strong>{p.provider}</strong> <span className="muted">{p.status}</span> · {formatMoney(p.amount_cents, p.currency)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : selectedOrder ? (
                  <p className="muted">Loading order #{selectedOrder}…</p>
                ) : (
                  <p className="muted">Select an order to view details.</p>
                )}
              </div>
            </div>
          ) : null}

          {tab === 'coupons' ? (
            <div className="admin-panel">
              <h3 className="h3">{editingCouponId ? 'Edit coupon' : 'Add coupon'}</h3>
              <form className="contact-form" onSubmit={submitCoupon}>
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">Code</span>
                    <input className="input" value={couponForm.code} onChange={(e) => setCouponForm((s) => ({ ...s, code: e.target.value }))} required />
                  </label>
                  <label className="field">
                    <span className="field-label">Currency</span>
                    <input className="input" value="INR" disabled readOnly />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Description</span>
                  <input className="input" value={couponForm.description} onChange={(e) => setCouponForm((s) => ({ ...s, description: e.target.value }))} />
                </label>
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">Discount type</span>
                    <select className="input" value={couponForm.discount_type} onChange={(e) => setCouponForm((s) => ({ ...s, discount_type: e.target.value }))}>
                      <option value="amount">Amount (₹)</option>
                      <option value="percent">Percent</option>
                    </select>
                  </label>
                  {couponForm.discount_type === 'amount' ? (
                    <label className="field">
                      <span className="field-label">Discount value (₹)</span>
                      <input
                        className="input"
                        value={couponForm.discount_value_inr}
                        onChange={(e) => setCouponForm((s) => ({ ...s, discount_value_inr: e.target.value }))}
                        placeholder="500"
                      />
                    </label>
                  ) : (
                    <label className="field">
                      <span className="field-label">Discount percent</span>
                      <input className="input" value={couponForm.discount_percent} onChange={(e) => setCouponForm((s) => ({ ...s, discount_percent: e.target.value }))} placeholder="10" />
                    </label>
                  )}
                </div>
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">Max redemptions</span>
                    <input className="input" value={couponForm.max_redemptions} onChange={(e) => setCouponForm((s) => ({ ...s, max_redemptions: e.target.value }))} placeholder="100" />
                  </label>
                  <label className="field">
                    <span className="field-label">Max per user</span>
                    <input className="input" value={couponForm.max_redemptions_per_user} onChange={(e) => setCouponForm((s) => ({ ...s, max_redemptions_per_user: e.target.value }))} placeholder="1" />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Min order total (₹)</span>
                  <input
                    className="input"
                    value={couponForm.min_order_total_inr}
                    onChange={(e) => setCouponForm((s) => ({ ...s, min_order_total_inr: e.target.value }))}
                    placeholder="999"
                  />
                </label>
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">Starts at (date &amp; time)</span>
                    <DateTimePicker
                      value={couponForm.starts_at}
                      onChange={(next) => setCouponForm((s) => ({ ...s, starts_at: next }))}
                      disabled={disabled}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Ends at (date &amp; time)</span>
                    <DateTimePicker
                      value={couponForm.ends_at}
                      onChange={(next) => setCouponForm((s) => ({ ...s, ends_at: next }))}
                      disabled={disabled}
                    />
                  </label>
                </div>
                <label className="field field-inline">
                  <input type="checkbox" checked={couponForm.is_active} onChange={(e) => setCouponForm((s) => ({ ...s, is_active: e.target.checked }))} />
                  <span className="field-label">Active</span>
                </label>
                <div className="button-row">
                  <button className="button button-solid" type="submit" disabled={disabled}>
                    {disabled ? 'Saving…' : editingCouponId ? 'Update coupon' : 'Create coupon'}
                  </button>
                  {editingCouponId ? (
                    <button className="button" type="button" onClick={cancelCouponEdit} disabled={disabled}>
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>

              <h3 className="h3" style={{ marginTop: 18 }}>Existing coupons</h3>
              <div className="admin-table">
                <div className="admin-row admin-head">
                  <div>ID</div>
                  <div>Code</div>
                  <div>Type</div>
                  <div>Value</div>
                  <div>Active</div>
                  <div>Actions</div>
                </div>
                {coupons.map((c) => (
                  <div key={c.id} className="admin-row">
                    <div>{c.id}</div>
                    <div className="admin-cell-wrap">{c.code}</div>
                    <div>{c.discount_type}</div>
                    <div>
                      {c.discount_type === 'percent'
                        ? `${c.discount_percent}%`
                        : formatMoney(c.discount_value_cents, c.currency)}
                    </div>
                    <div>{c.is_active ? 'Yes' : 'No'}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="button button-ghost" type="button" onClick={() => beginCouponEdit(c)} disabled={disabled}>
                        Edit
                      </button>
                      <button className="button admin-danger" type="button" onClick={() => deleteCoupon(c.id)} disabled={disabled}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {!coupons.length ? <p className="muted">No coupons found.</p> : null}
            </div>
          ) : null}

          {tab === 'discount_rules' ? (
            <div className="admin-panel">
              <h3 className="h3">{editingDiscountRuleId ? 'Edit bulk discount rule' : 'Add bulk discount rule'}</h3>
              <p className="muted">These rules apply automatically when customers checkout with multiple courses.</p>
              <form className="contact-form" onSubmit={editingDiscountRuleId ? saveDiscountRuleEdit : createDiscountRule}>
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">Min courses</span>
                    <input
                      className="input"
                      value={discountRuleForm.min_courses}
                      onChange={(e) => setDiscountRuleForm((s) => ({ ...s, min_courses: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Max courses</span>
                    <input
                      className="input"
                      value={discountRuleForm.max_courses}
                      onChange={(e) => setDiscountRuleForm((s) => ({ ...s, max_courses: e.target.value }))}
                      placeholder="Leave blank for no maximum"
                    />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Discount percent</span>
                  <input
                    className="input"
                    value={discountRuleForm.discount_percent}
                    onChange={(e) => setDiscountRuleForm((s) => ({ ...s, discount_percent: e.target.value }))}
                    placeholder="15"
                    required
                  />
                </label>
                <div className="button-row">
                  <button className="button button-solid" type="submit" disabled={disabled}>
                    {disabled ? 'Saving…' : editingDiscountRuleId ? 'Update rule' : 'Create rule'}
                  </button>
                  {editingDiscountRuleId ? (
                    <button className="button" type="button" onClick={cancelDiscountRuleEdit} disabled={disabled}>
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>

              <h3 className="h3" style={{ marginTop: 18 }}>Existing rules</h3>
              <div className="admin-table">
                <div className="admin-row admin-head">
                  <div>ID</div>
                  <div>Range</div>
                  <div>Percent</div>
                  <div>Active</div>
                  <div>Actions</div>
                </div>
                {discountRules.map((r) => (
                  <div key={r.id} className="admin-row">
                    <div>{r.id}</div>
                    <div>
                      {r.max_courses == null ? `${r.min_courses}+` : `${r.min_courses}–${r.max_courses}`}
                    </div>
                    <div>{r.discount_percent}%</div>
                    <div>{r.is_active ? 'Yes' : 'No'}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="button button-ghost" type="button" onClick={() => beginDiscountRuleEdit(r)} disabled={disabled}>
                        Edit
                      </button>
                      <button className="button admin-danger" type="button" onClick={() => deleteDiscountRule(r.id)} disabled={disabled}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {!discountRules.length ? <p className="muted">No rules yet. Add one above.</p> : null}
            </div>
          ) : null}

          {tab === 'notifications' ? (
            <div className="admin-panel">
              <h3 className="h3">Email & notifications</h3>
              <p className="muted">
                Broadcast sends to newsletter subscribers. In local dev, emails are queued and may be logged instead of delivered if SMTP is not configured.
              </p>

              <div className="admin-two-col">
                <div className="panel" style={{ margin: 0 }}>
                  <h4 className="h4">Broadcast newsletter</h4>
                  <form className="contact-form" onSubmit={submitBroadcast}>
                    <label className="field">
                      <span className="field-label">Subject</span>
                      <input className="input" value={broadcastForm.subject} onChange={(e) => setBroadcastForm((s) => ({ ...s, subject: e.target.value }))} required />
                    </label>
                    <label className="field">
                      <span className="field-label">Message</span>
                      <textarea className="input textarea" rows={5} value={broadcastForm.body_text} onChange={(e) => setBroadcastForm((s) => ({ ...s, body_text: e.target.value }))} required />
                    </label>
                    <button className="button button-solid" type="submit" disabled={disabled}>
                      {disabled ? 'Queueing…' : 'Send broadcast'}
                    </button>
                  </form>
                </div>

                <div className="panel" style={{ margin: 0 }}>
                  <h4 className="h4">Send push notification</h4>
                  <form className="contact-form" onSubmit={submitPush}>
                    <label className="field">
                      <span className="field-label">Audience</span>
                      <select className="input" value={pushForm.audience} onChange={(e) => setPushForm((s) => ({ ...s, audience: e.target.value }))}>
                        <option value="all_users">All users</option>
                        <option value="course_enrolled">Enrolled (course)</option>
                      </select>
                    </label>
                    {pushForm.audience === 'course_enrolled' ? (
                      <label className="field">
                        <span className="field-label">Course ID</span>
                        <input className="input" value={pushForm.course_id} onChange={(e) => setPushForm((s) => ({ ...s, course_id: e.target.value }))} required />
                      </label>
                    ) : null}
                    <label className="field">
                      <span className="field-label">Title</span>
                      <input className="input" value={pushForm.title} onChange={(e) => setPushForm((s) => ({ ...s, title: e.target.value }))} required />
                    </label>
                    <label className="field">
                      <span className="field-label">Message</span>
                      <textarea className="input textarea" rows={4} value={pushForm.body} onChange={(e) => setPushForm((s) => ({ ...s, body: e.target.value }))} required />
                    </label>
                    <label className="field">
                      <span className="field-label">Click URL</span>
                      <input className="input" value={pushForm.url} onChange={(e) => setPushForm((s) => ({ ...s, url: e.target.value }))} placeholder="/orders" />
                    </label>
                    <button className="button button-solid" type="submit" disabled={disabled}>
                      {disabled ? 'Queueing…' : 'Send push'}
                    </button>
                  </form>
                  <p className="muted" style={{ marginTop: 10 }}>
                    Note: users must have allowed notifications and subscribed on their device.
                  </p>
                </div>

                <div className="panel" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <h4 className="h4" style={{ margin: 0 }}>Email outbox</h4>
                    <button className="button button-ghost" type="button" onClick={refreshEmailOutbox} disabled={disabled}>
                      Refresh
                    </button>
                  </div>
                  <p className="muted" style={{ marginTop: 8 }}>
                    Shows queued and failed emails. Failed emails retry automatically with backoff when SMTP is configured.
                  </p>

                  <div className="admin-split" style={{ marginTop: 10 }}>
                    <label className="field">
                      <span className="field-label">Status</span>
                      <select
                        className="input"
                        value={emailOutboxFilter.status}
                        onChange={(e) => setEmailOutboxFilter((s) => ({ ...s, status: e.target.value }))}
                      >
                        <option value="failed">Failed</option>
                        <option value="pending">Pending</option>
                        <option value="sent">Sent</option>
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Search</span>
                      <input
                        className="input"
                        value={emailOutboxFilter.q}
                        onChange={(e) => setEmailOutboxFilter((s) => ({ ...s, q: e.target.value }))}
                        placeholder="email or subject"
                      />
                    </label>
                    <div className="button-row" style={{ alignSelf: 'end' }}>
                      <button className="button button-solid" type="button" onClick={refreshEmailOutbox} disabled={disabled}>
                        Apply
                      </button>
                    </div>
                  </div>

                  {emailOutboxStats ? (
                    <div className="panel" style={{ marginTop: 12, background: 'rgba(201, 122, 74, 0.06)' }}>
                      <div
                        className="admin-grid"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div className="muted">Pending</div>
                          <div className="h4" style={{ margin: 0 }}>{Number(emailOutboxStats.pending ?? 0)}</div>
                        </div>
                        <div>
                          <div className="muted">Failed</div>
                          <div className="h4" style={{ margin: 0 }}>{Number(emailOutboxStats.failed ?? 0)}</div>
                        </div>
                        <div>
                          <div className="muted">Sent</div>
                          <div className="h4" style={{ margin: 0 }}>{Number(emailOutboxStats.sent ?? 0)}</div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="admin-table" style={{ marginTop: 12 }}>
                    <div className="admin-row admin-head">
                      <div>ID</div>
                      <div>To</div>
                      <div>Subject</div>
                      <div>Status</div>
                      <div>Attempts</div>
                      <div>Next</div>
                      <div>Action</div>
                    </div>
                    {(emailOutbox ?? []).slice(0, 25).map((m) => (
                      <div key={m.id} className="admin-row">
                        <div>{m.id}</div>
                        <div style={{ wordBreak: 'break-word' }}>{m.to_email}</div>
                        <div style={{ wordBreak: 'break-word' }}>{m.subject}</div>
                        <div>{m.status}</div>
                        <div>{m.attempts}</div>
                        <div className="muted">{m.next_attempt_at ? formatDateTimeStandard(m.next_attempt_at) : '-'}</div>
                        <div>
                          {m.status === 'failed' ? (
                            <button className="button button-ghost" type="button" onClick={() => resendOutboxEmail(m.id)} disabled={disabled}>
                              Resend
                            </button>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!(emailOutbox ?? []).length ? <p className="muted" style={{ marginTop: 10 }}>No emails found.</p> : null}
                </div>

                <div className="panel" style={{ margin: 0 }}>
                  <h4 className="h4">Automations</h4>
                  <ul className="list">
                    <li>
                      <strong>Order confirmation</strong> <span className="muted">email</span>
                    </li>
                    <li>
                      <strong>Enrollment welcome</strong> <span className="muted">email</span>
                    </li>
                    <li>
                      <strong>Pre-class reminder</strong> <span className="muted">email/notification</span>
                    </li>
                    <li>
                      <strong>WhatsApp group link</strong> <span className="muted">post-purchase</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {false ? (
            <div className="admin-panel">
              <h3 className="h3">Content & media management</h3>
              {cmsError ? <p className="form-error">{cmsError}</p> : null}
              <div className="button-row" style={{ marginTop: 10 }}>
                <button className="button button-solid" type="button" onClick={() => loadTabData('content')} disabled={disabled}>
                  {disabled || cmsStatus === 'loading' ? 'Loading…' : 'Refresh content'}
                </button>
              </div>

	              <div className="admin-two-col" style={{ marginTop: 16 }}>
	                <div className="panel" style={{ margin: 0 }}>
	                  <h4 className="h4">Homepage hero</h4>
	                  <p className="muted" style={{ marginTop: 6 }}>
		                    {cmsMeta?.homepage_updated_at
		                      ? `Last updated: ${formatDateTimeStandard(cmsMeta.homepage_updated_at)}`
		                      : 'Tip: Update the hero and refresh to confirm changes.'}
	                  </p>
	                  <div className="panel" style={{ marginTop: 12, background: 'rgba(201, 122, 74, 0.06)' }}>
	                    <p className="section-kicker" style={{ marginTop: 0 }}>{homepageForm.hero_badge || 'Badge'}</p>
	                    <div className="h3" style={{ margin: 0, whiteSpace: 'pre-line' }}>{homepageForm.hero_title || 'Hero title'}</div>
	                    {homepageForm.hero_subtitle ? (
	                      <p className="muted" style={{ marginTop: 8, whiteSpace: 'pre-line' }}>{homepageForm.hero_subtitle}</p>
	                    ) : null}
	                    <div className="button-row" style={{ marginTop: 12 }}>
	                      <span className="button button-solid" aria-disabled="true">{homepageForm.hero_primary_cta_label || 'Primary CTA'}</span>
	                      {homepageForm.hero_secondary_cta_label ? (
	                        <span className="button button-ghost" aria-disabled="true">{homepageForm.hero_secondary_cta_label}</span>
	                      ) : null}
	                    </div>
	                  </div>
	                  <div className="admin-split">
	                    <label className="field">
	                      <span className="field-label">Badge</span>
	                      <input className="input" value={homepageForm.hero_badge} onChange={(e) => setHomepageForm((s) => ({ ...s, hero_badge: e.target.value }))} />
	                    </label>
                    <label className="field">
                      <span className="field-label">Image URL</span>
                      <input className="input" value={homepageForm.hero_image_url} onChange={(e) => setHomepageForm((s) => ({ ...s, hero_image_url: e.target.value }))} placeholder="/hero.jpeg or https://…" />
                      <input
                        className="input"
                        type="file"
                        accept="image/*"
                        disabled={disabled || mediaUploading}
                        style={{ marginTop: 10 }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const url = await uploadMediaAndGetUrl(file, { isPublic: true });
                            setHomepageForm((s) => ({ ...s, hero_image_url: url }));
                            setMessage('Hero image uploaded.');
                          } catch (err) {
                            setMessage(err?.message ?? 'Failed to upload image');
                          } finally {
                            e.target.value = '';
                          }
                        }}
                      />
                      <p className="muted" style={{ marginTop: 8 }}>
                        Upload an image to use as the hero background.
                      </p>
                    </label>
                  </div>
                  <label className="field">
                    <span className="field-label">Title (use newlines)</span>
                    <textarea className="input textarea" rows={2} value={homepageForm.hero_title} onChange={(e) => setHomepageForm((s) => ({ ...s, hero_title: e.target.value }))} />
                  </label>
                  <label className="field">
                    <span className="field-label">Subtitle (use newlines)</span>
                    <textarea className="input textarea" rows={2} value={homepageForm.hero_subtitle} onChange={(e) => setHomepageForm((s) => ({ ...s, hero_subtitle: e.target.value }))} />
                  </label>
                  <div className="admin-split">
                    <label className="field">
                      <span className="field-label">Primary CTA label</span>
                      <input className="input" value={homepageForm.hero_primary_cta_label} onChange={(e) => setHomepageForm((s) => ({ ...s, hero_primary_cta_label: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">Primary CTA href</span>
                      <input className="input" value={homepageForm.hero_primary_cta_href} onChange={(e) => setHomepageForm((s) => ({ ...s, hero_primary_cta_href: e.target.value }))} placeholder="/courses" />
                    </label>
                  </div>
                  <div className="admin-split">
                    <label className="field">
                      <span className="field-label">Secondary CTA label</span>
                      <input className="input" value={homepageForm.hero_secondary_cta_label} onChange={(e) => setHomepageForm((s) => ({ ...s, hero_secondary_cta_label: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">Secondary CTA href</span>
                      <input className="input" value={homepageForm.hero_secondary_cta_href} onChange={(e) => setHomepageForm((s) => ({ ...s, hero_secondary_cta_href: e.target.value }))} placeholder="/recipe-library" />
                    </label>
                  </div>
                  <label className="field field-inline">
                    <input type="checkbox" checked={homepageForm.is_published} onChange={(e) => setHomepageForm((s) => ({ ...s, is_published: e.target.checked }))} />
                    <span className="field-label">Published</span>
                  </label>
                  <button className="button button-solid" type="button" onClick={saveHomepage} disabled={disabled}>
                    Save homepage
                  </button>
                </div>

	                <div className="panel" style={{ margin: 0 }}>
	                  <h4 className="h4">About page</h4>
	                  <p className="muted" style={{ marginTop: 6 }}>
		                    {cmsMeta?.about_updated_at ? `Last updated: ${formatDateTimeStandard(cmsMeta.about_updated_at)}` : null}
	                  </p>
	                  <label className="field">
	                    <span className="field-label">Title</span>
	                    <input className="input" value={aboutCmsForm.title} onChange={(e) => setAboutCmsForm((s) => ({ ...s, title: e.target.value }))} />
	                  </label>
                  <label className="field">
                    <span className="field-label">Featured image URL</span>
                    <input className="input" value={aboutCmsForm.featured_image_url} onChange={(e) => setAboutCmsForm((s) => ({ ...s, featured_image_url: e.target.value }))} />
                    <input
                      className="input"
                      type="file"
                      accept="image/*"
                      disabled={disabled || mediaUploading}
                      style={{ marginTop: 10 }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const url = await uploadMediaAndGetUrl(file, { isPublic: true });
                          setAboutCmsForm((s) => ({ ...s, featured_image_url: url }));
                          setMessage('Featured image uploaded.');
                        } catch (err) {
                          setMessage(err?.message ?? 'Failed to upload image');
                        } finally {
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Content HTML</span>
                    <textarea className="input textarea" rows={8} value={aboutCmsForm.content_html} onChange={(e) => setAboutCmsForm((s) => ({ ...s, content_html: e.target.value }))} />
                  </label>
                  <label className="field field-inline">
                    <input type="checkbox" checked={aboutCmsForm.is_published} onChange={(e) => setAboutCmsForm((s) => ({ ...s, is_published: e.target.checked }))} />
                    <span className="field-label">Published</span>
                  </label>
                  <button className="button button-solid" type="button" onClick={saveAbout} disabled={disabled}>
                    Save about
                  </button>
                </div>
              </div>

              <div className="admin-two-col" style={{ marginTop: 16 }}>
                <div className="panel" style={{ margin: 0 }}>
                  <h4 className="h4">Testimonials</h4>
                  <form className="contact-form" onSubmit={addTestimonial}>
                    <div className="admin-split">
                      <label className="field">
                        <span className="field-label">Student name</span>
                        <input className="input" value={testimonialForm.student_name} onChange={(e) => setTestimonialForm((s) => ({ ...s, student_name: e.target.value }))} required />
                      </label>
                      <label className="field">
                        <span className="field-label">Avatar URL (optional)</span>
                        <input className="input" value={testimonialForm.avatar_url} onChange={(e) => setTestimonialForm((s) => ({ ...s, avatar_url: e.target.value }))} />
                      </label>
                    </div>
                    <label className="field">
                      <span className="field-label">Testimonial</span>
                      <textarea className="input textarea" rows={3} value={testimonialForm.testimonial_text} onChange={(e) => setTestimonialForm((s) => ({ ...s, testimonial_text: e.target.value }))} required />
                    </label>
                    <div className="admin-split">
                      <label className="field field-inline" style={{ marginTop: 10 }}>
                        <input type="checkbox" checked={testimonialForm.is_featured} onChange={(e) => setTestimonialForm((s) => ({ ...s, is_featured: e.target.checked }))} />
                        <span className="field-label">Featured</span>
                      </label>
                      <label className="field field-inline" style={{ marginTop: 10 }}>
                        <input type="checkbox" checked={testimonialForm.is_published} onChange={(e) => setTestimonialForm((s) => ({ ...s, is_published: e.target.checked }))} />
                        <span className="field-label">Published</span>
                      </label>
                    </div>
                    <button className="button button-solid" type="submit" disabled={disabled}>
                      Add testimonial
                    </button>
                  </form>

                  <div className="admin-table" style={{ marginTop: 12 }}>
                    <div className="admin-row admin-head">
                      <div>Name</div>
                      <div>Text</div>
                      <div>Status</div>
                      <div />
                    </div>
                    {(cmsTestimonials ?? []).slice(0, 50).map((t) => (
                      <div key={t.id} className="admin-row">
                        <div>{t.student_name}</div>
                        <div className="admin-cell-wrap">{String(t.testimonial_text).slice(0, 80)}</div>
                        <div>{t.is_published ? 'Published' : 'Draft'}</div>
                        <div style={{ textAlign: 'right' }}>
                          <button className="button button-ghost" type="button" onClick={() => deleteTestimonial(t.id)} disabled={disabled}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!(cmsTestimonials ?? []).length ? <p className="muted">No testimonials yet.</p> : null}
                </div>

                <div className="panel" style={{ margin: 0 }}>
                  <h4 className="h4">FAQs</h4>
                  <form className="contact-form" onSubmit={addFaq}>
                    <label className="field">
                      <span className="field-label">Category (optional)</span>
                      <input className="input" value={faqForm.category} onChange={(e) => setFaqForm((s) => ({ ...s, category: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">Question</span>
                      <input className="input" value={faqForm.question} onChange={(e) => setFaqForm((s) => ({ ...s, question: e.target.value }))} required />
                    </label>
                    <label className="field">
                      <span className="field-label">Answer (HTML allowed)</span>
                      <textarea className="input textarea" rows={4} value={faqForm.answer_html} onChange={(e) => setFaqForm((s) => ({ ...s, answer_html: e.target.value }))} required />
                    </label>
                    <label className="field field-inline">
                      <input type="checkbox" checked={faqForm.is_published} onChange={(e) => setFaqForm((s) => ({ ...s, is_published: e.target.checked }))} />
                      <span className="field-label">Published</span>
                    </label>
                    <button className="button button-solid" type="submit" disabled={disabled}>
                      Add FAQ
                    </button>
                  </form>

                  <div className="admin-table" style={{ marginTop: 12 }}>
                    <div className="admin-row admin-head">
                      <div>Question</div>
                      <div>Category</div>
                      <div>Status</div>
                      <div />
                    </div>
                    {(cmsFaqs ?? []).slice(0, 80).map((f) => (
                      <div key={f.id} className="admin-row">
                        <div className="admin-cell-wrap">{f.question}</div>
                        <div>{f.category || '—'}</div>
                        <div>{f.is_published ? 'Published' : 'Draft'}</div>
                        <div style={{ textAlign: 'right' }}>
                          <button className="button button-ghost" type="button" onClick={() => deleteFaq(f.id)} disabled={disabled}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!(cmsFaqs ?? []).length ? <p className="muted">No FAQs yet.</p> : null}
                </div>
              </div>

              <div className="admin-two-col" style={{ marginTop: 16 }}>
                <div className="panel" style={{ margin: 0 }}>
                  <h4 className="h4">Announcements</h4>
                  <form className="contact-form" onSubmit={createAnnouncement}>
                    <label className="field">
                      <span className="field-label">Message</span>
                      <input className="input" value={announcementForm.message} onChange={(e) => setAnnouncementForm((s) => ({ ...s, message: e.target.value }))} required />
                    </label>
                    <div className="admin-split">
                      <label className="field">
                        <span className="field-label">CTA label</span>
                        <input className="input" value={announcementForm.cta_label} onChange={(e) => setAnnouncementForm((s) => ({ ...s, cta_label: e.target.value }))} />
                      </label>
                      <label className="field">
                        <span className="field-label">CTA URL</span>
                        <input className="input" value={announcementForm.cta_url} onChange={(e) => setAnnouncementForm((s) => ({ ...s, cta_url: e.target.value }))} />
                      </label>
                    </div>
	                    <div className="admin-split">
	                      <div className="field">
	                        <DateTimePicker
	                          label="Starts at"
	                          value={announcementForm.starts_at}
	                          onChange={(iso) => setAnnouncementForm((s) => ({ ...s, starts_at: iso }))}
	                          disabled={disabled}
	                        />
	                      </div>
	                      <div className="field">
	                        <DateTimePicker
	                          label="Ends at"
	                          value={announcementForm.ends_at}
	                          onChange={(iso) => setAnnouncementForm((s) => ({ ...s, ends_at: iso }))}
	                          disabled={disabled}
	                        />
	                      </div>
	                    </div>
                    <label className="field field-inline">
                      <input type="checkbox" checked={announcementForm.is_active} onChange={(e) => setAnnouncementForm((s) => ({ ...s, is_active: e.target.checked }))} />
                      <span className="field-label">Active</span>
                    </label>
                    <button className="button button-solid" type="submit" disabled={disabled}>
                      Create announcement
                    </button>
                  </form>
                  <div className="admin-table" style={{ marginTop: 12 }}>
                    <div className="admin-row admin-head">
                      <div>Message</div>
                      <div>Active</div>
                      <div>Window</div>
                    </div>
                    {(cmsAnnouncements ?? []).slice(0, 20).map((a) => (
                      <div key={a.id} className="admin-row">
                        <div className="admin-cell-wrap">{a.message}</div>
                        <div>{a.is_active ? 'Yes' : 'No'}</div>
                        <div className="admin-cell-wrap">
                          {a.starts_at ? formatDateTimeStandard(a.starts_at) : '—'} → {a.ends_at ? formatDateTimeStandard(a.ends_at) : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel" style={{ margin: 0 }}>
                  <h4 className="h4">Legal pages</h4>
                  <form className="contact-form" onSubmit={saveLegal}>
                    <div className="admin-split">
                      <label className="field">
                        <span className="field-label">Slug</span>
                        <select className="input" value={legalForm.slug} onChange={(e) => setLegalForm((s) => ({ ...s, slug: e.target.value }))}>
                          <option value="privacy-policy">Privacy Policy</option>
                          <option value="terms-and-conditions">Terms & Conditions</option>
                          <option value="refund-policy">Refund Policy</option>
                        </select>
                      </label>
                      <label className="field">
                        <span className="field-label">Status</span>
                        <select className="input" value={legalForm.status} onChange={(e) => setLegalForm((s) => ({ ...s, status: e.target.value }))}>
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                        </select>
                      </label>
                    </div>
                    <label className="field">
                      <span className="field-label">Title</span>
                      <input className="input" value={legalForm.title} onChange={(e) => setLegalForm((s) => ({ ...s, title: e.target.value }))} required />
                    </label>
                    <label className="field">
                      <span className="field-label">Content HTML</span>
                      <textarea className="input textarea" rows={8} value={legalForm.content_html} onChange={(e) => setLegalForm((s) => ({ ...s, content_html: e.target.value }))} required />
                    </label>
                    <button className="button button-solid" type="submit" disabled={disabled}>
                      Save legal page
                    </button>
                  </form>
                </div>
              </div>

              <div className="admin-two-col" style={{ marginTop: 16 }}>
                <div className="panel" style={{ margin: 0 }}>
                  <h4 className="h4">SEO meta</h4>
                  <form className="contact-form" onSubmit={saveSeo}>
                    <label className="field">
                      <span className="field-label">Page key</span>
                      <select className="input" value={seoForm.page} onChange={(e) => setSeoForm((s) => ({ ...s, page: e.target.value }))}>
                        <option value="homepage">Homepage</option>
                        <option value="about">About</option>
                        <option value="courses">Courses</option>
                        <option value="recipes">Recipes</option>
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Meta title</span>
                      <input className="input" value={seoForm.meta_title} onChange={(e) => setSeoForm((s) => ({ ...s, meta_title: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">Meta description</span>
                      <textarea className="input textarea" rows={3} value={seoForm.meta_description} onChange={(e) => setSeoForm((s) => ({ ...s, meta_description: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">OG image URL</span>
                      <input className="input" value={seoForm.og_image_url} onChange={(e) => setSeoForm((s) => ({ ...s, og_image_url: e.target.value }))} />
                      <input
                        className="input"
                        type="file"
                        accept="image/*"
                        disabled={disabled || mediaUploading}
                        style={{ marginTop: 10 }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const url = await uploadMediaAndGetUrl(file, { isPublic: true });
                            setSeoForm((s) => ({ ...s, og_image_url: url }));
                            setMessage('OG image uploaded.');
                          } catch (err) {
                            setMessage(err?.message ?? 'Failed to upload image');
                          } finally {
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Canonical URL</span>
                      <input className="input" value={seoForm.canonical_url} onChange={(e) => setSeoForm((s) => ({ ...s, canonical_url: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">JSON‑LD (optional)</span>
                      <textarea className="input textarea" rows={4} value={seoForm.json_ld} onChange={(e) => setSeoForm((s) => ({ ...s, json_ld: e.target.value }))} />
                    </label>
                    <button className="button button-solid" type="submit" disabled={disabled}>
                      Save SEO
                    </button>
                  </form>
                </div>

                <div className="panel" style={{ margin: 0 }}>
                  <h4 className="h4">Student gallery</h4>
                  <form className="contact-form" onSubmit={addGalleryItem}>
                    <label className="field">
                      <span className="field-label">Image URL</span>
                      <input className="input" value={galleryForm.image_url} onChange={(e) => setGalleryForm((s) => ({ ...s, image_url: e.target.value }))} required />
                      <input
                        className="input"
                        type="file"
                        accept="image/*"
                        disabled={disabled || mediaUploading}
                        style={{ marginTop: 10 }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const url = await uploadMediaAndGetUrl(file, { isPublic: true });
                            setGalleryForm((s) => ({ ...s, image_url: url }));
                            setMessage('Gallery image uploaded.');
                          } catch (err) {
                            setMessage(err?.message ?? 'Failed to upload image');
                          } finally {
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Alt text</span>
                      <input className="input" value={galleryForm.alt_text} onChange={(e) => setGalleryForm((s) => ({ ...s, alt_text: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">Caption</span>
                      <input className="input" value={galleryForm.caption} onChange={(e) => setGalleryForm((s) => ({ ...s, caption: e.target.value }))} />
                    </label>
                    <div className="admin-split">
                      <label className="field field-inline" style={{ marginTop: 10 }}>
                        <input type="checkbox" checked={galleryForm.is_featured} onChange={(e) => setGalleryForm((s) => ({ ...s, is_featured: e.target.checked }))} />
                        <span className="field-label">Featured</span>
                      </label>
                      <label className="field field-inline" style={{ marginTop: 10 }}>
                        <input type="checkbox" checked={galleryForm.is_published} onChange={(e) => setGalleryForm((s) => ({ ...s, is_published: e.target.checked }))} />
                        <span className="field-label">Published</span>
                      </label>
                    </div>
                    <button className="button button-solid" type="submit" disabled={disabled}>
                      Add gallery item
                    </button>
                  </form>
                  <div className="admin-table" style={{ marginTop: 12 }}>
                    <div className="admin-row admin-head">
                      <div>Image</div>
                      <div>Caption</div>
                      <div />
                    </div>
                    {(cmsGallery ?? []).slice(0, 40).map((g) => (
                      <div key={g.id} className="admin-row">
                        <div className="admin-cell-wrap">{String(g.image_url).slice(0, 40)}</div>
                        <div className="admin-cell-wrap">{g.caption || '—'}</div>
                        <div style={{ textAlign: 'right' }}>
                          <button className="button button-ghost" type="button" onClick={() => deleteGalleryItem(g.id)} disabled={disabled}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="panel" style={{ marginTop: 16 }}>
                <h4 className="h4">Newsletter subscribers</h4>
                <p className="muted">Latest signups (admin-only).</p>
                <div className="admin-table">
                  <div className="admin-row admin-head">
                    <div>Email</div>
                    <div>Status</div>
                    <div>Subscribed</div>
                  </div>
                  {(newsletterSubscribers ?? []).slice(0, 50).map((s) => (
                    <div key={s.id} className="admin-row">
                      <div className="admin-cell-wrap">{s.email}</div>
                      <div>{s.status}</div>
                      <div className="admin-cell-wrap">{s.subscribed_at ? formatDateTimeStandard(s.subscribed_at) : '—'}</div>
                    </div>
                  ))}
                </div>
                {!(newsletterSubscribers ?? []).length ? <p className="muted">No subscribers yet.</p> : null}
              </div>
            </div>
          ) : null}

          {tab === 'reports' ? (
            <div className="admin-panel">
              <h3 className="h3">Reports</h3>
              {reportsError ? <p className="form-error">{reportsError}</p> : null}
              <div className="panel" style={{ marginTop: 10 }}>
                <h4 className="h4">Date range</h4>
                <div className="button-row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                  {[
                    ['today', 'Today'],
                    ['last_7', '7 days'],
                    ['last_30', '30 days'],
                    ['custom', 'Custom'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      className={`button ${reportsPreset === id ? 'button-solid' : 'button-ghost'}`}
                      type="button"
                      onClick={() => setReportsPreset(id)}
                      disabled={reportsStatus === 'loading'}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {reportsPreset === 'custom' ? (
                  <div className="admin-split" style={{ marginTop: 12 }}>
                    <label className="field">
                      <span className="field-label">From</span>
                      <input className="input" type="date" value={reportsFrom} onChange={(e) => setReportsFrom(e.target.value)} />
                    </label>
                    <label className="field">
                      <span className="field-label">To</span>
                      <input className="input" type="date" value={reportsTo} onChange={(e) => setReportsTo(e.target.value)} />
                    </label>
                  </div>
                ) : null}

                <div className="button-row" style={{ marginTop: 10 }}>
                  <button className="button button-solid" type="button" onClick={generateReports} disabled={reportsStatus === 'loading'}>
                    {reportsStatus === 'loading' ? 'Generating…' : 'Generate report'}
                  </button>
                </div>
              </div>

              {reportsData?.revenue || reportsData?.enrollments || reportsData?.ordersSummary || reportsData?.topCourses ? (
                <div className="admin-two-col" style={{ marginTop: 16 }}>
                  <div className="panel" style={{ margin: 0 }}>
                    <h4 className="h4">Revenue</h4>
                    <p className="muted">
                      Total: {formatMoney(reportsData?.revenue?.totals?.total_sales_cents ?? 0, 'INR')} · Payments:{' '}
                      {Number(reportsData?.revenue?.totals?.payments ?? 0)}
                    </p>
                    <div className="button-row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                      <button className="button button-ghost" type="button" onClick={exportRevenueCsv} disabled={!reportsData?.revenue}>
                        Export CSV
                      </button>
                      <button className="button button-ghost" type="button" onClick={exportRevenuePdf} disabled={!reportsData?.revenue}>
                        Export PDF
                      </button>
                    </div>
                    <div className="admin-table" style={{ marginTop: 12 }}>
                      <div className="admin-row admin-head">
                        <div>Day</div>
                        <div>Revenue</div>
                        <div>Payments</div>
                      </div>
                      {(reportsData?.revenue?.daily ?? []).slice(-14).map((d) => (
                        <div key={String(d.day)} className="admin-row">
                          <div>{String(d.day)}</div>
                          <div>{formatMoney(d.revenue_cents, 'INR')}</div>
                          <div>{Number(d.payments ?? 0)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel" style={{ margin: 0 }}>
                    <h4 className="h4">Orders summary</h4>
                    <p className="muted">Counts and totals by status.</p>
                    <div className="button-row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                      <button className="button button-ghost" type="button" onClick={exportOrdersCsv} disabled={!reportsData?.ordersSummary}>
                        Export CSV
                      </button>
                      <button className="button button-ghost" type="button" onClick={exportOrdersPdf} disabled={!reportsData?.ordersSummary}>
                        Export PDF
                      </button>
                    </div>
                    <div className="admin-table" style={{ marginTop: 12 }}>
                      <div className="admin-row admin-head">
                        <div>Status</div>
                        <div>Orders</div>
                        <div>Total</div>
                      </div>
                      {(reportsData?.ordersSummary?.summary ?? []).map((r) => (
                        <div key={String(r.status)} className="admin-row">
                          <div>{String(r.status)}</div>
                          <div>{Number(r.orders ?? 0)}</div>
                          <div>{formatMoney(r.total_cents, 'INR')}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel" style={{ margin: 0 }}>
                    <h4 className="h4">Enrollments</h4>
                    <p className="muted">
                      Total: {Number(reportsData?.enrollments?.totals?.total_enrollments ?? 0)} · Active students:{' '}
                      {Number(reportsData?.enrollments?.totals?.active_students ?? 0)}
                    </p>
                    <div className="button-row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                      <button className="button button-ghost" type="button" onClick={exportEnrollmentsCsv} disabled={!reportsData?.enrollments}>
                        Export CSV
                      </button>
                      <button className="button button-ghost" type="button" onClick={exportEnrollmentsPdf} disabled={!reportsData?.enrollments}>
                        Export PDF
                      </button>
                    </div>
                    <div className="admin-table" style={{ marginTop: 12 }}>
                      <div className="admin-row admin-head">
                        <div>Day</div>
                        <div>Enrollments</div>
                      </div>
                      {(reportsData?.enrollments?.daily ?? []).slice(-14).map((d) => (
                        <div key={String(d.day)} className="admin-row">
                          <div>{String(d.day)}</div>
                          <div>{Number(d.enrollments ?? 0)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel" style={{ margin: 0 }}>
                    <h4 className="h4">Top courses (by revenue)</h4>
                    <p className="muted">Top 20 courses by revenue for this range.</p>
                    <div className="button-row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                      <button className="button button-ghost" type="button" onClick={exportTopCoursesCsv} disabled={!reportsData?.topCourses}>
                        Export CSV
                      </button>
                      <button className="button button-ghost" type="button" onClick={exportTopCoursesPdf} disabled={!reportsData?.topCourses}>
                        Export PDF
                      </button>
                    </div>
                    <div className="admin-table" style={{ marginTop: 12 }}>
                      <div className="admin-row admin-head">
                        <div>Course</div>
                        <div>Revenue</div>
                        <div>Orders</div>
                      </div>
                      {(reportsData?.topCourses?.by_revenue ?? []).slice(0, 10).map((c) => (
                        <div key={String(c.course_id)} className="admin-row">
                          <div className="admin-cell-wrap">{c.title}</div>
                          <div>{formatMoney(c.revenue_cents, 'INR')}</div>
                          <div>{Number(c.orders ?? 0)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel" style={{ margin: 0 }}>
                    <h4 className="h4">Q&amp;A report</h4>
                    <p className="muted">Course questions opened/answered/resolved for this range.</p>
                    <div className="admin-table" style={{ marginTop: 12 }}>
                      <div className="admin-row admin-head">
                        <div>Open</div>
                        <div>Answered</div>
                        <div>Resolved</div>
                        <div>Closed</div>
                      </div>
                      <div className="admin-row">
                        <div>{Number(reportsData?.qa?.counts?.open ?? 0)}</div>
                        <div>{Number(reportsData?.qa?.counts?.answered ?? 0)}</div>
                        <div>{Number(reportsData?.qa?.counts?.resolved ?? 0)}</div>
                        <div>{Number(reportsData?.qa?.counts?.closed ?? 0)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="panel" style={{ margin: 0 }}>
                    <h4 className="h4">Support report</h4>
                    <p className="muted">Support ticket status counts for this range.</p>
                    <div className="admin-table" style={{ marginTop: 12 }}>
                      <div className="admin-row admin-head">
                        <div>Open</div>
                        <div>Pending</div>
                        <div>Resolved</div>
                        <div>Closed</div>
                      </div>
                      <div className="admin-row">
                        <div>{Number(reportsData?.support?.counts?.open ?? 0)}</div>
                        <div>{Number(reportsData?.support?.counts?.pending ?? 0)}</div>
                        <div>{Number(reportsData?.support?.counts?.resolved ?? 0)}</div>
                        <div>{Number(reportsData?.support?.counts?.closed ?? 0)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'settings' ? (
            <div className="admin-panel">
              <h3 className="h3">Site settings</h3>
              <p className="muted">These settings are stored in the database and used by the frontend.</p>
              <form className="contact-form" onSubmit={saveSettings}>
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">Site name</span>
                    <input className="input" value={settingsForm.site_name} onChange={(e) => setSettingsForm((s) => ({ ...s, site_name: e.target.value }))} required />
                  </label>
                  <label className="field">
                    <span className="field-label">Currency</span>
                    <input className="input" value={settingsForm.currency} onChange={(e) => setSettingsForm((s) => ({ ...s, currency: e.target.value }))} placeholder="INR" />
                  </label>
                </div>
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">Logo URL</span>
                    <input className="input" value={settingsForm.logo_url} onChange={(e) => setSettingsForm((s) => ({ ...s, logo_url: e.target.value }))} placeholder="/api/media/123/file" />
                  </label>
                  <label className="field">
                    <span className="field-label">Favicon URL</span>
                    <input className="input" value={settingsForm.favicon_url} onChange={(e) => setSettingsForm((s) => ({ ...s, favicon_url: e.target.value }))} placeholder="/favicon.svg" />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">GST number</span>
                  <input className="input" value={settingsForm.gst_number} onChange={(e) => setSettingsForm((s) => ({ ...s, gst_number: e.target.value }))} />
                </label>
                <label className="field field-inline">
                  <input type="checkbox" checked={settingsForm.maintenance_mode} onChange={(e) => setSettingsForm((s) => ({ ...s, maintenance_mode: e.target.checked }))} />
                  <span className="field-label">Maintenance mode</span>
                </label>
                <button className="button button-solid" type="submit" disabled={disabled}>
                  {disabled ? 'Saving…' : 'Save settings'}
                </button>
              </form>

              <div className="panel" style={{ marginTop: 16 }}>
                <h4 className="h4">Razorpay (Test / Live)</h4>
                <p className="muted" style={{ marginTop: 6 }}>
                  Current mode: <strong>{String(razorpayConfig.mode ?? 'test')}</strong> · Test key: {razorpayConfig.test_key_id_masked || 'not set'} · Live key:{' '}
                  {razorpayConfig.live_key_id_masked || 'not set'}
                </p>
                <p className="muted" style={{ marginTop: 6 }}>
                  Leave fields blank to keep existing secrets. Keys are stored encrypted in the database and never shown back.
                </p>

                <form className="contact-form" onSubmit={saveRazorpayConfig}>
                  <label className="field">
                    <span className="field-label">Mode</span>
                    <select
                      className="input"
                      value={razorpayForm.mode}
                      onChange={(e) => setRazorpayForm((s) => ({ ...s, mode: e.target.value }))}
                    >
                      <option value="test">Test</option>
                      <option value="live">Live</option>
                    </select>
                  </label>

                  <label className="field field-inline" style={{ marginTop: 2 }}>
                    <input type="checkbox" checked={showRazorpaySecrets} onChange={(e) => setShowRazorpaySecrets(e.target.checked)} />
                    <span className="field-label">Show secret inputs</span>
                  </label>

                  <div className="admin-split" style={{ marginTop: 10 }}>
                    <label className="field">
                      <span className="field-label">Test key id</span>
                      <input
                        className="input"
                        value={razorpayForm.test_key_id}
                        onChange={(e) => setRazorpayForm((s) => ({ ...s, test_key_id: e.target.value }))}
                        placeholder={razorpayConfig.test_key_id_masked || 'rzp_test_...'}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Live key id</span>
                      <input
                        className="input"
                        value={razorpayForm.live_key_id}
                        onChange={(e) => setRazorpayForm((s) => ({ ...s, live_key_id: e.target.value }))}
                        placeholder={razorpayConfig.live_key_id_masked || 'rzp_live_...'}
                      />
                    </label>
                  </div>

                  <div className="admin-split">
                    <label className="field">
                      <span className="field-label">Test key secret</span>
                      <input
                        className="input"
                        type={showRazorpaySecrets ? 'text' : 'password'}
                        value={razorpayForm.test_key_secret}
                        onChange={(e) => setRazorpayForm((s) => ({ ...s, test_key_secret: e.target.value }))}
                        placeholder={razorpayConfig.has_test_secret ? '•••••••• (already set)' : 'paste test secret'}
                        autoComplete="off"
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Live key secret</span>
                      <input
                        className="input"
                        type={showRazorpaySecrets ? 'text' : 'password'}
                        value={razorpayForm.live_key_secret}
                        onChange={(e) => setRazorpayForm((s) => ({ ...s, live_key_secret: e.target.value }))}
                        placeholder={razorpayConfig.has_live_secret ? '•••••••• (already set)' : 'paste live secret'}
                        autoComplete="off"
                      />
                    </label>
                  </div>

                  <div className="admin-split">
                    <label className="field">
                      <span className="field-label">Test webhook secret</span>
                      <input
                        className="input"
                        type={showRazorpaySecrets ? 'text' : 'password'}
                        value={razorpayForm.test_webhook_secret}
                        onChange={(e) => setRazorpayForm((s) => ({ ...s, test_webhook_secret: e.target.value }))}
                        placeholder={razorpayConfig.has_test_webhook_secret ? '•••••••• (already set)' : 'paste webhook secret'}
                        autoComplete="off"
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Live webhook secret</span>
                      <input
                        className="input"
                        type={showRazorpaySecrets ? 'text' : 'password'}
                        value={razorpayForm.live_webhook_secret}
                        onChange={(e) => setRazorpayForm((s) => ({ ...s, live_webhook_secret: e.target.value }))}
                        placeholder={razorpayConfig.has_live_webhook_secret ? '•••••••• (already set)' : 'paste webhook secret'}
                        autoComplete="off"
                      />
                    </label>
                  </div>

                  <button className="button button-solid" type="submit" disabled={disabled}>
                    {disabled ? 'Saving…' : 'Save Razorpay settings'}
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          {tab === 'courses' ? (
            <div className="admin-panel">
              <h3 className="h3">{editingCourseId ? 'Edit hands-on class' : 'Add hands-on class'}</h3>
              <form className="contact-form" onSubmit={submitCourse}>
                <label className="field">
                  <span className="field-label">Title</span>
                  <input className="input" value={courseForm.title} onChange={(e) => setCourseForm((s) => ({ ...s, title: e.target.value }))} required />
                </label>
                <label className="field">
                  <span className="field-label">Description</span>
                  <textarea className="input textarea" rows={4} value={courseForm.summary} onChange={(e) => setCourseForm((s) => ({ ...s, summary: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Content</span>
                  <textarea className="input textarea" rows={6} value={courseForm.content} onChange={(e) => setCourseForm((s) => ({ ...s, content: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Categories (Hands-On Classes always applied)</span>
                  <select
                    className="input"
                    multiple
                    value={courseForm.category_ids}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                      setCourseForm((s) => ({ ...s, category_ids: selected }));
                    }}
                  >
                    {courseCategories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <p className="muted">Tip: Hold Ctrl/Cmd to select multiple categories.</p>
                  <label className="field">
                    <span className="field-label">Selected categories</span>
                    <input className="input" value={courseSelectedCategoryNames} readOnly placeholder="No categories selected" />
                  </label>
                </label>
                <details className="admin-inline-add">
                  <summary className="link">Add a new class category</summary>
                  <div className="admin-inline-add-body">
                    <div className="admin-split">
                      <label className="field">
                        <span className="field-label">Name</span>
                        <input
                          className="input"
                          value={categoryForm.type === 'course' ? categoryForm.name : ''}
                          onChange={(e) => setCategoryForm((s) => ({ ...s, type: 'course', name: e.target.value }))}
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">Slug (optional)</span>
                        <input
                          className="input"
                          value={categoryForm.type === 'course' ? categoryForm.slug : ''}
                          onChange={(e) => setCategoryForm((s) => ({ ...s, type: 'course', slug: e.target.value }))}
                        />
                      </label>
                    </div>
                    <label className="field">
                      <span className="field-label">Description (optional)</span>
                      <input
                        className="input"
                        value={categoryForm.type === 'course' ? categoryForm.description : ''}
                        onChange={(e) => setCategoryForm((s) => ({ ...s, type: 'course', description: e.target.value }))}
                      />
                    </label>
                    <button
                      className="button button-solid"
                      type="button"
                      disabled={disabled || categoryForm.type !== 'course' || !categoryForm.name}
                      onClick={async () => {
                        const result = await addCategoryInline('course', categoryForm);
                        if (!result?.createdId) return;
                        setCourseForm((s) => ({
                          ...s,
                          category_ids: Array.from(new Set([...(s.category_ids ?? []), String(result.createdId)])),
                        }));
                        setCategoryForm({ type: 'course', name: '', slug: '', description: '' });
                      }}
                    >
                      {disabled ? 'Saving…' : 'Add category'}
                    </button>
                  </div>
                </details>
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">Currency</span>
                    <select className="input" value={courseForm.currency} onChange={(e) => setCourseForm((s) => ({ ...s, currency: e.target.value }))}>
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Price</span>
                    <input className="input" value={courseForm.price_inr} onChange={(e) => setCourseForm((s) => ({ ...s, price_inr: e.target.value }))} placeholder="999" />
                  </label>
                </div>
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">Compare-at (optional)</span>
                    <input className="input" value={courseForm.compare_at_inr} onChange={(e) => setCourseForm((s) => ({ ...s, compare_at_inr: e.target.value }))} placeholder="1299" />
                  </label>
                  <label className="field">
                    <span className="field-label">Sale price (optional)</span>
                    <input className="input" value={courseForm.sale_price_inr} onChange={(e) => setCourseForm((s) => ({ ...s, sale_price_inr: e.target.value }))} placeholder="899" />
                  </label>
                </div>
	                <div className="admin-split">
	                  <label className="field">
	                    <span className="field-label">Sale starts (date &amp; time, optional)</span>
	                    <DateTimePicker
	                      value={courseForm.sale_starts_at}
	                      onChange={(next) => setCourseForm((s) => ({ ...s, sale_starts_at: next }))}
	                      disabled={disabled}
	                    />
	                  </label>
	                  <label className="field">
	                    <span className="field-label">Sale ends (date &amp; time, optional)</span>
	                    <DateTimePicker
	                      value={courseForm.sale_ends_at}
	                      onChange={(next) => setCourseForm((s) => ({ ...s, sale_ends_at: next }))}
	                      disabled={disabled}
	                    />
	                  </label>
	                </div>
                <label className="field">
                  <span className="field-label">Image URL</span>
                  <input className="input" value={courseForm.featured_image_url} onChange={(e) => setCourseForm((s) => ({ ...s, featured_image_url: e.target.value }))} placeholder="https://..." />
                </label>
                <label className="field field-inline">
                  <input type="checkbox" checked={courseForm.is_published} onChange={(e) => setCourseForm((s) => ({ ...s, is_published: e.target.checked }))} />
                  <span className="field-label">Publish on save</span>
                </label>
	                <label className="field">
	                  <span className="field-label">Schedule publish at (date &amp; time, optional)</span>
	                  <DateTimePicker
	                    value={courseForm.publish_at}
	                    onChange={(next) => setCourseForm((s) => ({ ...s, publish_at: next }))}
	                    disabled={disabled}
	                  />
	                </label>
                <label className="field field-inline">
                  <input type="checkbox" checked={courseForm.qa_enabled} onChange={(e) => setCourseForm((s) => ({ ...s, qa_enabled: e.target.checked }))} />
                  <span className="field-label">Enable Q&amp;A for this class</span>
                </label>
                {editingCourseId ? <p className="muted">Zoom fields below are kept for new course creation. Use the Live Sessions tab to edit an existing session.</p> : null}
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">Schedule live session (ISO datetime)</span>
                    <input className="input" value={courseForm.scheduled_at} onChange={(e) => setCourseForm((s) => ({ ...s, scheduled_at: e.target.value }))} placeholder="2026-05-11T18:30:00.000Z" />
                  </label>
                  <label className="field">
                    <span className="field-label">Zoom meeting id</span>
                    <input className="input" value={courseForm.zoom_meeting_id} onChange={(e) => setCourseForm((s) => ({ ...s, zoom_meeting_id: e.target.value }))} />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Zoom join URL</span>
                  <input className="input" value={courseForm.zoom_join_url} onChange={(e) => setCourseForm((s) => ({ ...s, zoom_join_url: e.target.value }))} placeholder="https://zoom.us/j/..." />
                </label>
                <div className="button-row">
                  <button className="button button-solid" type="submit" disabled={disabled}>{disabled ? 'Saving…' : editingCourseId ? 'Update class' : 'Create class'}</button>
                  {editingCourseId ? (
                    <button className="button" type="button" onClick={cancelCourseEdit} disabled={disabled}>
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>

              <h3 className="h3">Hands-On Classes</h3>
              {courseProgressStatus === 'error' ? <p className="form-error">{courseProgressError}</p> : null}
              {courseProgressStatus === 'loading' ? <p className="muted">Loading course progress…</p> : null}
              {courseProgress?.users?.length ? (
                <div className="panel" style={{ marginTop: 12 }}>
                  <h4 className="h4">Student progress (course #{courseProgress.course_id})</h4>
                  <div className="admin-table" style={{ marginTop: 10 }}>
                    <div className="admin-row admin-head">
                      <div>User</div>
                      <div>Progress</div>
                      <div>Completed</div>
                      <div>Expiry</div>
                    </div>
                    {(courseProgress.users ?? []).slice(0, 50).map((u) => (
                      <div key={u.enrollment_id} className="admin-row">
                        <div>{u.email}</div>
                        <div>{u.progress_percentage}%</div>
                        <div>
                          {u.completed_lessons}/{u.total_lessons}
                        </div>
                        <div>{String(u.expiry_date ?? '')}</div>
                      </div>
                    ))}
                  </div>
                  {(courseProgress.users ?? []).length > 50 ? <p className="muted">Showing first 50 students.</p> : null}
                </div>
              ) : null}
              <div className="admin-table">
                <div className="admin-row admin-head">
                  <div>ID</div>
                  <div>Title</div>
                  <div>Price</div>
                  <div>Published</div>
                  <div />
                </div>
                {courses.map((c) => (
                  <div key={c.id} className="admin-row">
                    <div>{c.id}</div>
                    <div>{c.title}</div>
                    <div>{c.amount_cents ? `${c.currency} ${(c.amount_cents / 100).toFixed(0)}` : '—'}</div>
                    <div>{c.is_published ? 'Yes' : 'No'}</div>
                    <div>
                      <button className="button" type="button" onClick={() => beginCourseEdit(c)} disabled={disabled}>
                        Edit
                      </button>
                      <button className="button" type="button" onClick={() => loadCourseProgress(c.id)} disabled={disabled}>
                        Progress
                      </button>
                      <button className="button button-solid admin-danger" type="button" onClick={() => removeCourse(c.id)} disabled={disabled}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'workshops' ? (
            <div className="admin-panel">
              <h3 className="h3">{editingWorkshopId ? 'Edit workshop' : 'Add workshop'}</h3>
              <form className="contact-form" onSubmit={submitWorkshop}>
                <label className="field">
                  <span className="field-label">Title</span>
                  <input className="input" value={workshopForm.title} onChange={(e) => setWorkshopForm((s) => ({ ...s, title: e.target.value }))} required />
                </label>
                <label className="field">
                  <span className="field-label">Description</span>
                  <textarea className="input textarea" rows={4} value={workshopForm.summary} onChange={(e) => setWorkshopForm((s) => ({ ...s, summary: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Content</span>
                  <textarea className="input textarea" rows={6} value={workshopForm.content} onChange={(e) => setWorkshopForm((s) => ({ ...s, content: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Categories</span>
                  {workshopCategories && workshopCategories.length ? (
                    <SelectMenu
                      value={workshopCategoryPicker}
                      options={workshopCategoryOptions}
                      placeholder="Add a workshop category"
                      ariaLabel="Add workshop category"
                      onChange={(value) => {
                        addWorkshopCategory(value);
                        setWorkshopCategoryPicker('');
                      }}
                    />
                  ) : null}
                  {(!workshopCategories || workshopCategories.length === 0) ? (
                    <div style={{ marginTop: 8 }}>
                      <p className="muted">No workshop categories found.</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="button button-ghost"
                          disabled={!token || status === 'loading'}
                          onClick={async () => {
                            if (!token) return setMessage('Unauthorized. Please sign in as an admin.');
                            setStatus('loading');
                            setMessage('Creating default workshop categories...');
                            try {
                              const defaults = [
                                { type: 'workshop', name: 'Upcoming Live Workshops', slug: 'upcoming-live-workshops' },
                                { type: 'workshop', name: 'Recorded Live Workshops', slug: 'recorded-live-workshop' },
                                { type: 'workshop', name: 'E-Books', slug: 'e-book' },
                              ];
                              for (const d of defaults) {
                                try {
                                  await api.admin.categories.create(token, d);
                                } catch (err) {
                                  // ignore individual failures
                                }
                              }
                              const fresh = await api.admin.categories.list(token, 'workshop');
                              setWorkshopCategories(fresh?.categories ?? []);
                              setMessage('Default workshop categories created.');
                            } catch (err) {
                              setMessage(err?.message ?? 'Failed to create default categories');
                            } finally {
                              setStatus('idle');
                            }
                          }}
                        >
                          Create default categories
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {workshopSelectedCategoryLabels.length ? (
                    <div className="admin-chip-list" style={{ marginTop: 10 }}>
                      {workshopSelectedCategoryLabels.map((label, index) => {
                        const selectedId = String(workshopForm.category_ids?.[index] ?? '');
                        return (
                          <button
                            key={`${label}-${selectedId}`}
                            type="button"
                            className="pill admin-chip"
                            onClick={() => removeWorkshopCategory(selectedId)}
                            title="Remove category"
                          >
                            <span>{label}</span>
                            <span aria-hidden="true" style={{ marginLeft: 8 }}>×</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <p className="muted">Pick a category from the dropdown. Click a chip to remove it.</p>
                </label>
                <details className="admin-inline-add">
                  <summary className="link">Add a new workshop category</summary>
                  <div className="admin-inline-add-body">
                    <div className="admin-split">
                      <label className="field">
                        <span className="field-label">Name</span>
                        <input
                          className="input"
                          value={categoryForm.type === 'workshop' ? categoryForm.name : ''}
                          onChange={(e) => setCategoryForm((s) => ({ ...s, type: 'workshop', name: e.target.value }))}
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">Slug (optional)</span>
                        <input
                          className="input"
                          value={categoryForm.type === 'workshop' ? categoryForm.slug : ''}
                          onChange={(e) => setCategoryForm((s) => ({ ...s, type: 'workshop', slug: e.target.value }))}
                        />
                      </label>
                    </div>
                    <label className="field">
                      <span className="field-label">Description (optional)</span>
                      <input
                        className="input"
                        value={categoryForm.type === 'workshop' ? categoryForm.description : ''}
                        onChange={(e) => setCategoryForm((s) => ({ ...s, type: 'workshop', description: e.target.value }))}
                      />
                    </label>
                    <button
                      className="button button-solid"
                      type="button"
                      disabled={disabled || categoryForm.type !== 'workshop' || !categoryForm.name}
                      onClick={async () => {
                        const result = await addCategoryInline('workshop', categoryForm);
                        if (!result?.createdId) return;
                        setWorkshopForm((s) => ({
                          ...s,
                          category_ids: Array.from(new Set([...(s.category_ids ?? []), String(result.createdId)])),
                        }));
                        setCategoryForm({ type: 'workshop', name: '', slug: '', description: '' });
                      }}
                    >
                      {disabled ? 'Saving…' : 'Add category'}
                    </button>
                  </div>
                </details>
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">Currency</span>
                    <select className="input" value={workshopForm.currency} onChange={(e) => setWorkshopForm((s) => ({ ...s, currency: e.target.value }))}>
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Price</span>
                    <input className="input" value={workshopForm.price_inr} onChange={(e) => setWorkshopForm((s) => ({ ...s, price_inr: e.target.value }))} placeholder="2000" />
                  </label>
                </div>
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">Compare-at (optional)</span>
                    <input className="input" value={workshopForm.compare_at_inr} onChange={(e) => setWorkshopForm((s) => ({ ...s, compare_at_inr: e.target.value }))} placeholder="2500" />
                  </label>
                  <label className="field">
                    <span className="field-label">Sale price (optional)</span>
                    <input className="input" value={workshopForm.sale_price_inr} onChange={(e) => setWorkshopForm((s) => ({ ...s, sale_price_inr: e.target.value }))} placeholder="1800" />
                  </label>
                </div>
                <div className="admin-split">
                  <div className="field">
                    <DateTimePicker
                      label="Sale starts (date & time, optional)"
                      value={workshopForm.sale_starts_at}
                      onChange={(iso) => setWorkshopForm((s) => ({ ...s, sale_starts_at: iso }))}
                      disabled={disabled}
                    />
                  </div>
                  <div className="field">
                    <DateTimePicker
                      label="Sale ends (date & time, optional)"
                      value={workshopForm.sale_ends_at}
                      onChange={(iso) => setWorkshopForm((s) => ({ ...s, sale_ends_at: iso }))}
                      disabled={disabled}
                    />
                  </div>
                </div>
                <label className="field">
                  <span className="field-label">Image URL</span>
                  <input className="input" value={workshopForm.featured_image_url} onChange={(e) => setWorkshopForm((s) => ({ ...s, featured_image_url: e.target.value }))} placeholder="https://..." />
                </label>
                <label className="field field-inline">
                  <input type="checkbox" checked={workshopForm.is_published} onChange={(e) => setWorkshopForm((s) => ({ ...s, is_published: e.target.checked }))} />
                  <span className="field-label">Publish on save</span>
                </label>
                <div className="field">
                  <DateTimePicker
                    label="Schedule publish at (date & time, optional)"
                    value={workshopForm.publish_at}
                    onChange={(iso) => setWorkshopForm((s) => ({ ...s, publish_at: iso }))}
                    disabled={disabled}
                  />
                </div>
                <label className="field field-inline">
                  <input type="checkbox" checked={workshopForm.qa_enabled} onChange={(e) => setWorkshopForm((s) => ({ ...s, qa_enabled: e.target.checked }))} />
                  <span className="field-label">Enable Q&amp;A for this workshop</span>
                </label>
                {editingWorkshopId ? <p className="muted">Zoom fields below are kept for new workshop creation. Use the Live Sessions tab to edit an existing session.</p> : null}
                <div className="admin-split">
                  <div className="field">
                    <DateTimePicker
                      label="Schedule live session (date & time)"
                      value={workshopForm.scheduled_at}
                      onChange={(iso) => setWorkshopForm((s) => ({ ...s, scheduled_at: iso }))}
                      disabled={disabled}
                    />
                  </div>
                  <label className="field">
                    <span className="field-label">Zoom meeting id</span>
                    <input className="input" value={workshopForm.zoom_meeting_id} onChange={(e) => setWorkshopForm((s) => ({ ...s, zoom_meeting_id: e.target.value }))} />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Zoom join URL</span>
                  <input className="input" value={workshopForm.zoom_join_url} onChange={(e) => setWorkshopForm((s) => ({ ...s, zoom_join_url: e.target.value }))} placeholder="https://zoom.us/j/..." />
                </label>
                <div className="button-row">
                  <button className="button button-solid" type="submit" disabled={disabled}>{disabled ? 'Saving…' : editingWorkshopId ? 'Update workshop' : 'Create workshop'}</button>
                  {editingWorkshopId ? (
                    <button className="button" type="button" onClick={cancelWorkshopEdit} disabled={disabled}>
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>

              <h3 className="h3">Workshops</h3>
              <div className="admin-split" style={{ marginBottom: 10 }}>
                <label className="field">
                  <span className="field-label">Category</span>
                  <select
                    className="input"
                    value={workshopBucketFilter}
                    onChange={(e) => setWorkshopBucketFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    {WORKSHOP_BUCKETS.map((b) => (
                      <option key={b.slug} value={b.slug}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div />
              </div>
              <div className="admin-table">
                <div className="admin-row admin-head">
                  <div>ID</div>
                  <div>Title</div>
                  <div>Price</div>
                  <div>Published</div>
                  <div />
                </div>
	                {filteredWorkshops.map((w) => (
	                  <div key={w.id} className="admin-row">
	                    <div>{w.id}</div>
	                    <div>{w.title}</div>
	                    <div>{w.amount_cents ? `${w.currency} ${(w.amount_cents / 100).toFixed(0)}` : '—'}</div>
	                    <div>{w.is_published ? 'Yes' : 'No'}</div>
	                    <div>
	                      <button className="button" type="button" onClick={() => beginWorkshopEdit(w)} disabled={disabled}>
	                        Edit
	                      </button>
	                      <button
	                        className="button button-solid admin-danger"
	                        type="button"
	                        onClick={() => removeWorkshop(w.id)}
	                        disabled={disabled || Boolean(w.__offline)}
	                      >
	                        Delete
	                      </button>
	                    </div>
	                  </div>
	                ))}
              </div>
            </div>
          ) : null}

          {false ? (
            <div className="admin-panel">
              <h3 className="h3">Add category</h3>
              <form className="contact-form" onSubmit={submitCategory}>
                <label className="field">
                  <span className="field-label">Type</span>
                  <select className="input" value={categoryForm.type} onChange={(e) => setCategoryForm((s) => ({ ...s, type: e.target.value }))}>
                    <option value="course">course</option>
                    <option value="workshop">workshop</option>
                    <option value="recipe">recipe</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Name</span>
                  <input className="input" value={categoryForm.name} onChange={(e) => setCategoryForm((s) => ({ ...s, name: e.target.value }))} required />
                </label>
                <label className="field">
                  <span className="field-label">Slug (optional)</span>
                  <input className="input" value={categoryForm.slug} onChange={(e) => setCategoryForm((s) => ({ ...s, slug: e.target.value }))} />
                </label>
                <button className="button button-solid" type="submit" disabled={disabled}>{disabled ? 'Saving…' : 'Create category'}</button>
              </form>

              <h3 className="h3">Categories</h3>
              <div className="admin-table">
                <div className="admin-row admin-head">
                  <div>ID</div>
                  <div>Type</div>
                  <div>Name</div>
                  <div>Slug</div>
                  <div />
                </div>
                {categories.map((c) => (
                  <div key={c.id} className="admin-row">
                    <div>{c.id}</div>
                    <div>{c.type}</div>
                    <div>{c.name}</div>
                    <div>{c.slug}</div>
                    <div>
                      <button className="button button-solid admin-danger" type="button" onClick={() => removeCategory(c.id)} disabled={disabled}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'recipes' ? (
            <div className="admin-panel">
              <h3 className="h3">{editingRecipeId ? 'Edit recipe' : 'Add recipe'}</h3>
              <form className="contact-form" onSubmit={submitRecipe}>
                <label className="field">
                  <span className="field-label">Title</span>
                  <input className="input" value={recipeForm.title} onChange={(e) => setRecipeForm((s) => ({ ...s, title: e.target.value }))} required />
                </label>
                <label className="field">
                  <span className="field-label">Summary</span>
                  <textarea className="input textarea" rows={3} value={recipeForm.summary} onChange={(e) => setRecipeForm((s) => ({ ...s, summary: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Categories</span>
                  <select
                    className="input"
                    value={String(recipeForm.category_ids?.[0] ?? '')}
                    onChange={(e) => {
                      const next = String(e.target.value ?? '');
                      if (next === '__add_category__') {
                        setRecipeCategoryAddOpen(true);
                        setRecipeForm((s) => ({ ...s, category_ids: s.category_ids ?? [] }));
                        return;
                      }
                      setRecipeCategoryAddOpen(false);
                      setRecipeForm((s) => ({ ...s, category_ids: next ? [next] : [] }));
                    }}
                  >
                    <option value="">Select category</option>
                    {recipeCategories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </option>
                    ))}
                    <option value="__add_category__">＋ Add category</option>
                  </select>
                  <p className="muted">Choose one category for this recipe.</p>
                </label>
                <label className="field">
                  <span className="field-label">Tags</span>
                  <select
                    className="input"
                    multiple
                    value={recipeForm.tag_ids}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                      setRecipeForm((s) => ({ ...s, tag_ids: selected }));
                    }}
                  >
                    {tags.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <p className="muted">Tip: Hold Ctrl/Cmd to select multiple tags.</p>
                  <div className="admin-split" style={{ alignItems: 'end' }}>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">New tag</span>
                      <input className="input" value={tagForm.name} onChange={(e) => setTagForm({ name: e.target.value })} placeholder="eg: gluten-free" />
                    </label>
                    <button
                      className="button button-ghost"
                      type="button"
                      disabled={disabled || !tagForm.name}
                      onClick={async () => {
                        if (!token) return;
                        setStatus('loading');
                        setMessage('');
                        try {
                          await api.admin.tags.create(token, { tag_type: 'recipe', name: tagForm.name });
                          setTagForm({ name: '' });
                          const tagData = await api.admin.tags.list(token, { type: 'recipe' });
                          setTags(tagData?.tags ?? []);
                          setMessage('Tag created.');
                        } catch (err) {
                          setMessage(err?.message ?? 'Failed to create tag');
                        } finally {
                          setStatus('idle');
                        }
                      }}
                    >
                      Add tag
                    </button>
                  </div>
                </label>
                <details className="admin-inline-add" open={recipeCategoryAddOpen} onToggle={(e) => setRecipeCategoryAddOpen(Boolean(e.currentTarget.open))}>
                  <summary className="link">Add a new recipe category</summary>
                  <div className="admin-inline-add-body">
                    <div className="admin-split">
                      <label className="field">
                        <span className="field-label">Name</span>
                        <input
                          className="input"
                          value={categoryForm.type === 'recipe' ? categoryForm.name : ''}
                          onChange={(e) => setCategoryForm((s) => ({ ...s, type: 'recipe', name: e.target.value }))}
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">Slug (optional)</span>
                        <input
                          className="input"
                          value={categoryForm.type === 'recipe' ? categoryForm.slug : ''}
                          onChange={(e) => setCategoryForm((s) => ({ ...s, type: 'recipe', slug: e.target.value }))}
                        />
                      </label>
                    </div>
                    <label className="field">
                      <span className="field-label">Description (optional)</span>
                      <input
                        className="input"
                        value={categoryForm.type === 'recipe' ? categoryForm.description : ''}
                        onChange={(e) => setCategoryForm((s) => ({ ...s, type: 'recipe', description: e.target.value }))}
                      />
                    </label>
                    <button
                      className="button button-solid"
                      type="button"
                      disabled={disabled || categoryForm.type !== 'recipe' || !categoryForm.name}
                      onClick={async () => {
                        const result = await addCategoryInline('recipe', categoryForm);
                        if (!result?.createdId) return;
                        setRecipeForm((s) => ({
                          ...s,
                          category_ids: [String(result.createdId)],
                        }));
                        setCategoryForm({ type: 'recipe', name: '', slug: '', description: '' });
                        setRecipeCategoryAddOpen(false);
                      }}
                    >
                      {disabled ? 'Saving…' : 'Add category'}
                    </button>
                  </div>
                </details>
                <label className="field">
                  <span className="field-label">Image URL</span>
                  <input className="input" value={recipeForm.featured_image_url} onChange={(e) => setRecipeForm((s) => ({ ...s, featured_image_url: e.target.value }))} placeholder="https://..." />
                </label>
                <label className="field">
                  <span className="field-label">Schedule publish at (ISO datetime, optional)</span>
                  <input
                    className="input"
                    value={recipeForm.publish_at}
                    onChange={(e) => setRecipeForm((s) => ({ ...s, publish_at: e.target.value }))}
                    placeholder="2026-06-01T10:00:00.000Z"
                  />
                  <p className="muted">If set, keep “Publish on save” unchecked to schedule.</p>
                </label>
                <label className="field">
                  <span className="field-label">Content (optional)</span>
                  <textarea className="input textarea" rows={5} value={recipeForm.content} onChange={(e) => setRecipeForm((s) => ({ ...s, content: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Description (optional)</span>
                  <textarea className="input textarea" rows={3} value={recipeForm.description} onChange={(e) => setRecipeForm((s) => ({ ...s, description: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Ingredients (one per line)</span>
                  <textarea className="input textarea" rows={4} value={recipeForm.ingredients} onChange={(e) => setRecipeForm((s) => ({ ...s, ingredients: e.target.value }))} placeholder={"eg:\n200g flour\n100g sugar\n1 tsp baking powder"} />
                </label>
                <label className="field">
                  <span className="field-label">Step-by-step Instructions (one step per line)</span>
                  <textarea className="input textarea" rows={6} value={recipeForm.instructions} onChange={(e) => setRecipeForm((s) => ({ ...s, instructions: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Notes (optional)</span>
                  <textarea className="input textarea" rows={3} value={recipeForm.notes} onChange={(e) => setRecipeForm((s) => ({ ...s, notes: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Publish</span>
                  <select
                    className="input"
                    value={recipeForm.is_published ? 'published' : 'draft'}
                    onChange={(e) => setRecipeForm((s) => ({ ...s, is_published: e.target.value === 'published' }))}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>
                <div className="button-row">
                  <button className="button button-solid" type="submit" disabled={disabled}>
                    {disabled ? 'Saving…' : editingRecipeId ? 'Update recipe' : 'Create recipe'}
                  </button>
                  {editingRecipeId ? (
                    <button className="button" type="button" onClick={cancelRecipeEdit} disabled={disabled}>
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>

              <h3 className="h3">Recipes</h3>
              <div className="admin-table">
                <div className="admin-row admin-head">
                  <div>ID</div>
                  <div>Title</div>
                  <div>Slug</div>
                  <div>Published</div>
                  <div />
                </div>
	                {recipes.map((r) => (
	                  <div key={r.id} className="admin-row">
	                    <div>{r.id}</div>
	                    <div>{r.title}</div>
	                    <div>{r.slug}</div>
	                    <div>{r.is_published ? 'Yes' : 'No'}</div>
	                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
	                      <button className="button" type="button" onClick={() => beginRecipeEdit(r)} disabled={disabled}>
	                        Edit
	                      </button>
	                      <button className="button" type="button" onClick={() => deleteRecipe(r.id)} disabled={disabled || Boolean(r.__offline)}>
	                        Delete
	                      </button>
	                    </div>
	                  </div>
	                ))}
              </div>
            </div>
          ) : null}

          {tab === 'sessions' ? (
            <div className="admin-panel">
              <h3 className="h3">{editingSessionId ? 'Edit live session' : 'Schedule live session'}</h3>
              <form className="contact-form" onSubmit={submitSession}>
                <label className="field">
                  <span className="field-label">Course ID</span>
                  <input className="input" value={sessionForm.course_id} onChange={(e) => setSessionForm((s) => ({ ...s, course_id: e.target.value }))} required />
                </label>
                <label className="field">
                  <span className="field-label">Scheduled date</span>
                  <input
                    className="input calendar-input"
                    type="date"
                    value={formatDateOnlyValue(sessionForm.scheduled_at)}
                    onChange={(e) =>
                      setSessionForm((s) => ({
                        ...s,
                        scheduled_at: e.target.value ? mergeDateWithTime(e.target.value, s.scheduled_at) : '',
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Zoom meeting id</span>
                  <input className="input" value={sessionForm.zoom_meeting_id} onChange={(e) => setSessionForm((s) => ({ ...s, zoom_meeting_id: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Zoom join URL</span>
                  <input className="input" value={sessionForm.zoom_join_url} onChange={(e) => setSessionForm((s) => ({ ...s, zoom_join_url: e.target.value }))} placeholder="https://zoom.us/j/..." />
                </label>
                <div className="button-row">
                  <button className="button button-solid" type="submit" disabled={disabled}>{disabled ? 'Saving…' : editingSessionId ? 'Update session' : 'Create session'}</button>
                  {editingSessionId ? (
                    <button className="button" type="button" onClick={cancelSessionEdit} disabled={disabled}>
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>

              <h3 className="h3">Sessions</h3>
              <div className="admin-table">
                <div className="admin-row admin-head">
                  <div>ID</div>
                  <div>Course</div>
                  <div>Scheduled</div>
                  <div>Status</div>
                  <div />
                </div>
                {sessions.map((s) => (
                  <div key={s.id} className="admin-row">
                    <div>{s.id}</div>
                    <div>{s.course_title ? `${s.course_title} (${s.course_id})` : s.course_id}</div>
                    <div>{String(s.scheduled_at)}</div>
                    <div>{s.status}</div>
                    <div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="button" type="button" onClick={() => beginSessionEdit(s)} disabled={disabled}>
                          Edit
                        </button>
                        <button className="button" type="button" onClick={() => deleteSession(s.id)} disabled={disabled}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'recordings' ? (
            <div className="admin-panel">
              <h3 className="h3">{editingRecordingId ? 'Edit recording' : 'Upload recording'}</h3>
              <form className="contact-form" onSubmit={submitRecording}>
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">Live session ID</span>
                    <input className="input" value={recordingForm.live_session_id} onChange={(e) => setRecordingForm((s) => ({ ...s, live_session_id: e.target.value }))} required />
                  </label>
                  <label className="field">
                    <span className="field-label">Course ID</span>
                    <input className="input" value={recordingForm.course_id} onChange={(e) => setRecordingForm((s) => ({ ...s, course_id: e.target.value }))} required />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Recording URL</span>
                  <input className="input" value={recordingForm.recording_url} onChange={(e) => setRecordingForm((s) => ({ ...s, recording_url: e.target.value }))} placeholder="https://..." required />
                  <input
                    className="input"
                    type="file"
                    accept="video/*"
                    disabled={disabled || mediaUploading}
                    style={{ marginTop: 10 }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadMediaAndGetUrl(file, { isPublic: true });
                        setRecordingForm((s) => ({ ...s, recording_url: url }));
                        setMessage('Recording uploaded.');
                      } catch (err) {
                        setMessage(err?.message ?? 'Failed to upload recording');
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                  <p className="muted" style={{ marginTop: 8 }}>
                    Upload a video file, or paste an external URL (YouTube/Vimeo/Drive).
                  </p>
                </label>
                <div className="button-row">
                  <button className="button button-solid" type="submit" disabled={disabled}>{disabled ? 'Saving…' : editingRecordingId ? 'Update recording' : 'Add recording'}</button>
                  {editingRecordingId ? (
                    <button className="button" type="button" onClick={cancelRecordingEdit} disabled={disabled}>
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>

              <h3 className="h3">Recordings</h3>
              <div className="admin-table">
                <div className="admin-row admin-head">
                  <div>ID</div>
                  <div>Course</div>
                  <div>Session</div>
                  <div>URL</div>
                  <div />
                </div>
                {recordings.map((r) => (
                  <div key={r.id} className="admin-row">
                    <div>{r.id}</div>
                    <div>{r.course_id}</div>
                    <div>{r.live_session_id}</div>
                    <div className="admin-cell-wrap">{r.recording_url}</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="button" type="button" onClick={() => beginRecordingEdit(r)} disabled={disabled}>
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'users' ? (
            <div className="admin-panel">
              <div className="admin-split" style={{ alignItems: 'center', gridTemplateColumns: '1fr', justifyItems: 'end' }}>
                <div className="button-row" style={{ justifyContent: 'flex-end' }}>
                  <button className="button button-ghost" type="button" onClick={exportAllUsers} disabled={disabled}>
                    Export users (CSV)
                  </button>
                </div>
              </div>
              <div className="admin-table">
                <div className="admin-row admin-head">
                  <div>ID</div>
                  <div>Name</div>
                  <div>Email</div>
                  <div>Role</div>
                  <div>Created</div>
                  <div />
                </div>
                {users.map((u) => (
                  <div key={u.id} className="admin-row">
                    <div>{u.id}</div>
                    <div>{u.name || '—'}</div>
                    <div>{u.email}</div>
                    <div>{u.role}</div>
                    <div>{String(u.created_at)}</div>
                    <div>
                      <button className="button" type="button" onClick={() => impersonateFromAdmin(u)} disabled={disabled}>
                        Preview as
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'enrollments' ? (
            <div className="admin-panel">
              <div className="admin-split" style={{ alignItems: 'center' }}>
                <h3 className="h3" style={{ margin: 0 }}>Enroll user</h3>
                <div className="button-row" style={{ justifyContent: 'flex-end' }}>
                  <button className="button button-ghost" type="button" onClick={exportEnrollmentsListCsv} disabled={!enrollments?.length}>
                    Export enrollments (CSV)
                  </button>
                </div>
              </div>
              <form className="contact-form" onSubmit={submitEnrollment}>
                <div className="admin-split">
                  <label className="field">
                    <span className="field-label">User ID</span>
                    <input className="input" value={enrollForm.user_id} onChange={(e) => setEnrollForm((s) => ({ ...s, user_id: e.target.value }))} required />
                  </label>
                  <label className="field">
                    <span className="field-label">Course ID</span>
                    <input className="input" value={enrollForm.course_id} onChange={(e) => setEnrollForm((s) => ({ ...s, course_id: e.target.value }))} required />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Expiry date (YYYY-MM-DD, optional)</span>
                    <input className="input calendar-input" type="date" value={enrollForm.expiry_date} onChange={(e) => setEnrollForm((s) => ({ ...s, expiry_date: e.target.value }))} />
                </label>
                <button className="button button-solid" type="submit" disabled={disabled}>{disabled ? 'Saving…' : 'Enroll'}</button>
              </form>

              <h3 className="h3">Enrollments</h3>
              <div className="admin-table">
                <div className="admin-row admin-head">
                  <div>ID</div>
                  <div>User</div>
                  <div>Course</div>
                  <div>Expiry</div>
                  <div />
                </div>
                {enrollments.map((e) => (
                  <div key={e.id} className="admin-row">
                    <div>{e.id}</div>
                    <div>{e.user_email}</div>
                    <div>{e.course_title}</div>
                    <div>{String(e.expiry_date)}</div>
                    <div>
                      <button className="button" type="button" onClick={() => extendEnrollment(e)} disabled={disabled}>
                        Extend
                      </button>
                      <button className="button button-solid admin-danger" type="button" onClick={() => removeEnrollment(e.id)} disabled={disabled}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'support' ? (
            <div className="admin-panel">
              <div className="admin-two-col">
                <div>
                  <h3 className="h3">Support queue</h3>
                  {supportAnalytics ? (
                    <div className="panel" style={{ marginTop: 10 }}>
                      <div className="admin-metrics-grid">
                        <div className="admin-metric-card">
                          <div className="muted">Open</div>
                          <div className="admin-metric-value">{Number(supportAnalytics?.counts?.open ?? 0)}</div>
                        </div>
                        <div className="admin-metric-card">
                          <div className="muted">Pending</div>
                          <div className="admin-metric-value">{Number(supportAnalytics?.counts?.pending ?? 0)}</div>
                        </div>
                        <div className="admin-metric-card">
                          <div className="muted">Resolved</div>
                          <div className="admin-metric-value">{Number(supportAnalytics?.counts?.resolved ?? 0)}</div>
                        </div>
                        <div className="admin-metric-card">
                          <div className="muted">Avg first response (min)</div>
                          <div className="admin-metric-value">
                            {supportAnalytics?.avg_first_response_minutes == null ? '—' : Math.round(Number(supportAnalytics.avg_first_response_minutes))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="admin-split" style={{ marginTop: 12 }}>
                    <label className="field">
                      <span className="field-label">Status</span>
                      <select
                        className="input"
                        value={supportMeta.status}
                        onChange={(e) => setSupportMeta((s) => ({ ...s, status: e.target.value, page: 1 }))}
                      >
                        <option value="">All</option>
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Category</span>
                      <select
                        className="input"
                        value={supportMeta.category}
                        onChange={(e) => setSupportMeta((s) => ({ ...s, category: e.target.value, page: 1 }))}
                      >
                        <option value="">All</option>
                        <option value="payment">Payment</option>
                        <option value="access">Access</option>
                        <option value="technical">Technical</option>
                        <option value="certificate">Certificate</option>
                        <option value="live_workshop">Live workshop</option>
                        <option value="refund">Refund</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                  </div>

                  <label className="field">
                    <span className="field-label">Search</span>
                    <input
                      className="input"
                      value={supportMeta.q}
                      onChange={(e) => setSupportMeta((s) => ({ ...s, q: e.target.value, page: 1 }))}
                      placeholder="Ticket id / user email / subject"
                    />
                  </label>

                  <div className="button-row">
                    <button className="button button-solid" type="button" onClick={() => loadTabData('support')} disabled={disabled}>
                      {disabled ? 'Loading…' : 'Refresh'}
                    </button>
                  </div>

                  <div className="admin-table" style={{ marginTop: 12 }}>
                    <div className="admin-row admin-head">
                      <div>ID</div>
                      <div>User</div>
                      <div>Status</div>
                      <div>Priority</div>
                      <div />
                    </div>
                    {(supportTickets ?? []).map((t) => (
                      <div key={t.id} className="admin-row">
                        <div>#{t.id}</div>
                        <div className="admin-cell-wrap">{t.user_email ?? t.user_name ?? t.user_id}</div>
                        <div>{t.status}</div>
                        <div>{t.priority}</div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            className="button"
                            type="button"
                            onClick={async () => {
                              setSelectedSupportTicketId(t.id);
                              const thread = await api.admin.support.tickets.get(token, t.id);
                              setSupportThread(thread ?? null);
                            }}
                            disabled={disabled}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!(supportTickets ?? []).length ? <p className="muted">No tickets found.</p> : null}
                </div>

                <div>
                  <h3 className="h3">Ticket</h3>
                  {!supportThread?.ticket ? <p className="muted">Select a ticket from the queue.</p> : null}
                  {supportThread?.ticket ? (
                    <div className="panel">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <div>
                          <div className="h4" style={{ margin: 0 }}>
                            #{supportThread.ticket.id} · {supportThread.ticket.subject}
                          </div>
                          <div className="muted" style={{ marginTop: 6 }}>
                            {supportThread.ticket.user_email ? `${supportThread.ticket.user_email}` : ''} · {supportThread.ticket.category} · {supportThread.ticket.status}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <select
                            className="input"
                            value={supportThread.ticket.status}
                            onChange={(e) => patchSupportTicket({ status: e.target.value })}
                            disabled={disabled}
                          >
                            <option value="open">Open</option>
                            <option value="pending">Pending</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                          <select
                            className="input"
                            value={supportThread.ticket.priority}
                            onChange={(e) => patchSupportTicket({ priority: e.target.value })}
                            disabled={disabled}
                          >
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </div>

                      <div className="panel" style={{ marginTop: 12 }}>
                        <ul className="list">
                          {(supportThread.messages ?? []).map((m) => (
                            <li key={m.id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                <div style={{ minWidth: 0 }}>
                                  <strong>{m.sender_type === 'admin' ? 'Support' : m.sender_type === 'system' ? 'System' : 'Student'}</strong>
                                  <div className="muted" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{m.message_text}</div>
                                </div>
                                <div className="muted" style={{ whiteSpace: 'nowrap' }}>
                                  {m.created_at ? formatDateTimeStandard(m.created_at) : ''}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                        {!(supportThread.messages ?? []).length ? <p className="muted">No messages yet.</p> : null}
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <label className="field">
                          <span className="field-label">Reply</span>
                          <textarea
                            className="input textarea"
                            rows={4}
                            value={supportReplyDraft}
                            onChange={(e) => setSupportReplyDraft(e.target.value)}
                            disabled={supportReplySending || supportThread.ticket.status === 'closed'}
                          />
                        </label>
                        <div className="button-row">
                          <button
                            className="button button-solid"
                            type="button"
                            onClick={sendSupportReply}
                            disabled={supportReplySending || supportThread.ticket.status === 'closed'}
                          >
                            {supportReplySending ? 'Sending…' : supportThread.ticket.status === 'closed' ? 'Ticket closed' : 'Send reply'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'instructors' ? (
            <div className="admin-panel">
              <div className="admin-two-col">
                <div>
                  <h3 className="h3">Create instructor / team member</h3>
                  <form className="contact-form" onSubmit={createInstructor}>
                    <label className="field">
                      <span className="field-label">Name</span>
                      <input className="input" value={instructorForm.name} onChange={(e) => setInstructorForm((s) => ({ ...s, name: e.target.value }))} required />
                    </label>
                    <label className="field">
                      <span className="field-label">Email</span>
                      <input className="input" type="email" value={instructorForm.email} onChange={(e) => setInstructorForm((s) => ({ ...s, email: e.target.value }))} required />
                    </label>
                    <label className="field">
                      <span className="field-label">Password</span>
                      <input className="input" type="password" minLength={8} value={instructorForm.password} onChange={(e) => setInstructorForm((s) => ({ ...s, password: e.target.value }))} required />
                    </label>
                    <label className="field">
                      <span className="field-label">Role</span>
                      <select className="input" value={instructorForm.role} onChange={(e) => setInstructorForm((s) => ({ ...s, role: e.target.value }))}>
                        <option value="instructor">Instructor</option>
                        <option value="support_agent">Support agent</option>
                        <option value="content_editor">Content editor</option>
                        {isSuperAdmin ? <option value="admin">Admin</option> : null}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Bio (optional)</span>
                      <textarea className="input textarea" rows={4} value={instructorForm.instructor_bio} onChange={(e) => setInstructorForm((s) => ({ ...s, instructor_bio: e.target.value }))} />
                    </label>
                    <label className="field">
                      <span className="field-label">Avatar URL (optional)</span>
                      <input className="input" value={instructorForm.instructor_avatar} onChange={(e) => setInstructorForm((s) => ({ ...s, instructor_avatar: e.target.value }))} />
                    </label>
                    <button className="button button-solid" type="submit" disabled={disabled}>
                      {disabled ? 'Saving…' : 'Create'}
                    </button>
                  </form>
                </div>

                <div>
                  <h3 className="h3">Team members</h3>
                  <div className="admin-table">
                    <div className="admin-row admin-head">
                      <div>ID</div>
                      <div>Email</div>
                      <div>Role</div>
                      <div>Status</div>
                      <div />
                    </div>
                    {(instructors ?? []).map((u) => (
                      <div key={u.id} className="admin-row">
                        <div>{u.id}</div>
                        <div className="admin-cell-wrap">{u.email}</div>
                        <div>{u.role}</div>
                        <div>{u.instructor_status ?? 'active'}</div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            className="button"
                            type="button"
                            onClick={() => {
                              setEditingInstructorId(u.id);
                              setInstructorPatch({ role: u.role ?? 'instructor', instructor_status: u.instructor_status ?? 'active' });
                            }}
                            disabled={disabled}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!(instructors ?? []).length ? <p className="muted">No team members yet.</p> : null}

                  {editingInstructorId ? (
                    <div className="panel" style={{ marginTop: 12 }}>
                      <h4 className="h4">Update role / status</h4>
                      <div className="admin-split">
                        <label className="field">
                          <span className="field-label">Role</span>
                          <select className="input" value={instructorPatch.role} onChange={(e) => setInstructorPatch((s) => ({ ...s, role: e.target.value }))}>
                            <option value="instructor">Instructor</option>
                            <option value="support_agent">Support agent</option>
                            <option value="content_editor">Content editor</option>
                            {isSuperAdmin ? <option value="admin">Admin</option> : null}
                            {isSuperAdmin ? <option value="super_admin">Super admin</option> : null}
                            <option value="user">User</option>
                          </select>
                        </label>
                        <label className="field">
                          <span className="field-label">Status</span>
                          <select className="input" value={instructorPatch.instructor_status} onChange={(e) => setInstructorPatch((s) => ({ ...s, instructor_status: e.target.value }))}>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </label>
                      </div>
                      <div className="button-row">
                        <button className="button button-solid" type="button" onClick={saveInstructorPatch} disabled={disabled}>
                          {disabled ? 'Saving…' : 'Save'}
                        </button>
                        <button className="button button-ghost" type="button" onClick={() => setEditingInstructorId(null)} disabled={disabled}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'admins' ? (
            <div className="admin-panel">
              {!isSuperAdmin ? (
                <div className="panel">
                  <p className="form-error" role="alert" style={{ margin: 0 }}>
                    Forbidden. Super admin access required.
                  </p>
                </div>
              ) : (
              <div className="admin-two-col">
                <div>
                  <h3 className="h3">Add admin</h3>
                  <form className="contact-form" onSubmit={createAdmin}>
                    <label className="field">
                      <span className="field-label">Name</span>
                      <input className="input" value={adminForm.name} onChange={(e) => setAdminForm((s) => ({ ...s, name: e.target.value }))} required />
                    </label>
                    <label className="field">
                      <span className="field-label">Email</span>
                      <input className="input" value={adminForm.email} onChange={(e) => setAdminForm((s) => ({ ...s, email: e.target.value }))} type="email" required />
                    </label>
                    <label className="field">
                      <span className="field-label">Password</span>
                      <input className="input" value={adminForm.password} onChange={(e) => setAdminForm((s) => ({ ...s, password: e.target.value }))} type="password" minLength={8} required />
                    </label>
                    <button className="button button-solid" type="submit" disabled={disabled}>
                      {disabled ? 'Creating…' : 'Create admin'}
                    </button>
                  </form>
                </div>

                <div>
                  <h3 className="h3">Existing admins</h3>
                  <div className="admin-table">
                    <div className="admin-row admin-head">
                      <div>ID</div>
                      <div>Name</div>
                      <div>Email</div>
                      <div>Created</div>
                    </div>
                    {admins.map((a) => (
                      <div key={a.id} className="admin-row">
                        <div>{a.id}</div>
                        <div>{a.name}</div>
                        <div>{a.email}</div>
                        <div>{String(a.created_at)}</div>
                      </div>
                    ))}
                  </div>
                  {!admins.length ? <p className="muted">No admins found.</p> : null}
                </div>
              </div>
              )}
            </div>
          ) : null}

          {tab === 'super_admin' ? (
            <div className="admin-panel">
              {!isSuperAdmin ? (
                <div className="panel">
                  <p className="form-error" role="alert" style={{ margin: 0 }}>
                    Forbidden. Super admin access required.
                  </p>
                </div>
              ) : (
                <>
                  <div className="panel">
                    <h3 className="h3" style={{ marginTop: 0 }}>Super Admin</h3>
                    <p className="muted" style={{ marginBottom: 0 }}>
                      Manage admin accounts. Actions here can revoke access and force re-login.
                    </p>
                  </div>

                  <div className="panel">
                    <h3 className="h3" style={{ marginTop: 0 }}>Admins & super admins</h3>
                    {superAdminsStatus === 'loading' ? <p className="muted">Loading admins…</p> : null}
                    {superAdminsError ? <p className="form-error">{superAdminsError}</p> : null}
                    {superAdminsStatus !== 'loading' && !superAdminsError ? (
                      <div className="admin-table" style={{ marginTop: 12 }}>
                        <div className="admin-row admin-head">
                          <div>ID</div>
                          <div>Name</div>
                          <div>Email</div>
                          <div>Role</div>
                          <div>Last login</div>
                          <div />
                        </div>
                        {(superAdmins ?? []).map((a) => (
                          <div key={a.id} className="admin-row">
                            <div>{a.id}</div>
                            <div className="admin-cell-wrap">{a.name}</div>
                            <div className="admin-cell-wrap">{a.email}</div>
                            <div>{a.role}</div>
                            <div className="admin-cell-wrap">{a.last_login_at ? String(a.last_login_at) : '—'}</div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button
                                className="button button-ghost"
                                type="button"
                                onClick={() => setSuperModal({ type: 'reset_password', admin: a })}
                                disabled={disabled}
                              >
                                Reset password
                              </button>
                              {String(a.role) !== 'super_admin' ? (
                                <button
                                  className="button"
                                  type="button"
                                  onClick={() => setSuperModal({ type: 'revoke', admin: a })}
                                  disabled={disabled}
                                >
                                  Revoke access
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="panel">
                    <h3 className="h3" style={{ marginTop: 0 }}>Transfer super admin ownership</h3>
                    <p className="muted" style={{ marginTop: 6 }}>
                      Transfer ownership to another admin. This will log you out immediately.
                    </p>
                    <div className="admin-split" style={{ marginTop: 12 }}>
                      <label className="field">
                        <span className="field-label">New super admin</span>
                        <select
                          className="input"
                          value={superTransferTarget}
                          onChange={(e) => setSuperTransferTarget(e.target.value)}
                          disabled={disabled || superAdminsStatus === 'loading'}
                        >
                          <option value="">Select an admin…</option>
                          {(superAdmins ?? [])
                            .filter((a) => String(a.role) === 'admin')
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name || a.email} (#{a.id})
                              </option>
                            ))}
                        </select>
                      </label>
                      <div className="button-row" style={{ alignItems: 'end' }}>
                        <button
                          className="button button-solid"
                          type="button"
                          onClick={() => setSuperModal({ type: 'transfer', admin: null })}
                          disabled={disabled || !superTransferTarget}
                        >
                          Transfer ownership
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {superModal ? (
                <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm action">
                  <div className="modal">
                    <div className="modal-head">
                      <h3 className="h3 modal-title" style={{ margin: 0 }}>
                        {superModal.type === 'revoke'
                          ? 'Revoke admin access'
                          : superModal.type === 'transfer'
                            ? 'Transfer super admin'
                            : 'Reset password'}
                      </h3>
                      <button className="icon-button" type="button" onClick={closeSuperModal} disabled={superModalBusy} aria-label="Close">
                        ×
                      </button>
                    </div>

                    <div className="modal-body">
                      {superModal.type === 'revoke' ? (
                        <>
                          <p className="muted" style={{ margin: 0 }}>
                            This will downgrade <strong>{superModal.admin?.email}</strong> to a normal user and force logout.
                          </p>
                          <div className="button-row">
                            <button
                              className="button button-solid"
                              type="button"
                              onClick={() => superDoRevoke(superModal.admin)}
                              disabled={superModalBusy}
                            >
                              {superModalBusy ? 'Working…' : 'Confirm revoke'}
                            </button>
                            <button className="button button-ghost" type="button" onClick={closeSuperModal} disabled={superModalBusy}>
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : null}

                      {superModal.type === 'reset_password' ? (
                        <>
                          <p className="muted" style={{ margin: 0 }}>
                            Set a new password for <strong>{superModal.admin?.email}</strong>. This will force logout.
                          </p>
                          <label className="field">
                            <span className="field-label">New password</span>
                            <input
                              className="input"
                              type="password"
                              minLength={8}
                              value={superPasswordDraft}
                              onChange={(e) => setSuperPasswordDraft(e.target.value)}
                              placeholder="At least 8 characters"
                              disabled={superModalBusy}
                            />
                          </label>
                          <div className="button-row">
                            <button
                              className="button button-solid"
                              type="button"
                              onClick={() => superDoResetPassword(superModal.admin)}
                              disabled={superModalBusy || superPasswordDraft.trim().length < 8}
                            >
                              {superModalBusy ? 'Working…' : 'Confirm reset'}
                            </button>
                            <button className="button button-ghost" type="button" onClick={closeSuperModal} disabled={superModalBusy}>
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : null}

                      {superModal.type === 'transfer' ? (
                        <>
                          <p className="form-error" style={{ margin: 0 }}>
                            This will immediately log you out and transfer super admin ownership.
                          </p>
                          <p className="muted" style={{ margin: 0 }}>
                            New super admin: <strong>#{superTransferTarget}</strong>
                          </p>
                          <div className="button-row">
                            <button
                              className="button button-solid"
                              type="button"
                              onClick={superDoTransfer}
                              disabled={superModalBusy}
                            >
                              {superModalBusy ? 'Working…' : 'Confirm transfer'}
                            </button>
                            <button className="button button-ghost" type="button" onClick={closeSuperModal} disabled={superModalBusy}>
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {message ? <p className="muted">{message}</p> : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
