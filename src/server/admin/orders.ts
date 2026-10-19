import "server-only";
import type { OrderStatus, OrderType } from "@/server/enums";
import { Collections, db, doc } from "@/server/firestore";
import type { GstInvoiceDoc, OrderDoc, OrderItemDoc, PaymentDoc } from "@/server/models";

export interface OrderListRow {
  id: string;
  orderNo: string;
  customerName: string;
  customerEmail: string;
  type: OrderType;
  status: OrderStatus;
  total: string;
  itemCount: number;
  paymentStatus: string | null;
  createdAt: string;
}

export interface ListOrdersParams {
  q?: string;
  status?: OrderStatus | "ALL";
  type?: OrderType | "ALL";
  page?: number;
  perPage?: number;
}

/**
 * Firestore has no cross-field `contains` search — a text query over-fetches
 * a bounded recent batch (matching any status/type filter) and filters in
 * memory, same pattern used across the admin/catalog modules.
 */
const SEARCH_SCAN_LIMIT = 1000;

export async function listOrders(params: ListOrdersParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(Math.max(params.perPage ?? 20, 5), 100);
  const q = params.q?.trim().toLowerCase();
  const firestore = db();

  const baseQuery = () => {
    let query: FirebaseFirestore.Query = firestore.collection(Collections.orders);
    if (params.status && params.status !== "ALL") query = query.where("status", "==", params.status);
    if (params.type && params.type !== "ALL") query = query.where("type", "==", params.type);
    return query;
  };

  let rows: { id: string; data: OrderDoc }[];
  let total: number;

  if (q) {
    const snap = await baseQuery().orderBy("createdAt", "desc").limit(SEARCH_SCAN_LIMIT).get();
    const all = snap.docs.map((d) => ({ id: d.id, data: d.data() as OrderDoc }));
    const matched = all.filter(
      (r) =>
        r.data.orderNo.toLowerCase().includes(q) ||
        r.data.customerName.toLowerCase().includes(q) ||
        r.data.customerEmail.toLowerCase().includes(q) ||
        r.data.customerPhone?.toLowerCase().includes(q),
    );
    total = matched.length;
    rows = matched.slice((page - 1) * perPage, (page - 1) * perPage + perPage);
  } else {
    const [snap, countSnap] = await Promise.all([
      baseQuery()
        .orderBy("createdAt", "desc")
        .offset((page - 1) * perPage)
        .limit(perPage)
        .get(),
      baseQuery().count().get(),
    ]);
    rows = snap.docs.map((d) => ({ id: d.id, data: d.data() as OrderDoc }));
    total = countSnap.data().count;
  }

  const [itemCounts, latestPayments] = await Promise.all([
    Promise.all(rows.map((r) => doc(Collections.orders, r.id).collection("items").count().get())),
    Promise.all(
      rows.map((r) =>
        firestore.collection(Collections.payments).where("orderId", "==", r.id).orderBy("createdAt", "desc").limit(1).get(),
      ),
    ),
  ]);

  const list: OrderListRow[] = rows.map((r, i) => ({
    id: r.id,
    orderNo: r.data.orderNo,
    customerName: r.data.customerName,
    customerEmail: r.data.customerEmail,
    type: r.data.type,
    status: r.data.status,
    total: r.data.total,
    itemCount: itemCounts[i]!.data().count,
    paymentStatus: latestPayments[i]!.empty ? null : (latestPayments[i]!.docs[0]!.data() as PaymentDoc).status,
    createdAt: r.data.createdAt.toDate().toISOString(),
  }));

  return { list, total, page, perPage, pageCount: Math.max(1, Math.ceil(total / perPage)) };
}

interface ShippingAddressLike {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

function parseShippingAddress(json: unknown): ShippingAddressLike {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    return json as ShippingAddressLike;
  }
  return {};
}

export async function getOrderDetail(id: string) {
  const orderRef = doc(Collections.orders, id);
  const snap = await orderRef.get();
  if (!snap.exists) return null;
  const order = snap.data() as OrderDoc;
  const firestore = db();

  const [itemsSnap, paymentsSnap, gstSnap, memberSnap] = await Promise.all([
    orderRef.collection("items").orderBy("__name__", "asc").get(),
    firestore.collection(Collections.payments).where("orderId", "==", id).orderBy("createdAt", "desc").get(),
    firestore.collection(Collections.gstInvoices).where("orderId", "==", id).limit(1).get(),
    order.placedByMemberId ? firestore.collection(Collections.memberProfiles).doc(order.placedByMemberId).get() : Promise.resolve(null),
  ]);
  const gst = gstSnap.empty ? null : (gstSnap.docs[0]!.data() as GstInvoiceDoc);
  const placedByMember = memberSnap?.exists ? (memberSnap.data() as { memberCode: string }) : null;

  return {
    id,
    orderNo: order.orderNo,
    type: order.type,
    status: order.status,
    createdAt: order.createdAt.toDate().toISOString(),
    confirmedAt: order.confirmedAt?.toDate().toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toDate().toISOString() ?? null,
    customer: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
      userId: order.userId,
    },
    placedByMember: order.placedByMemberId && placedByMember ? { id: order.placedByMemberId, memberCode: placedByMember.memberCode } : null,
    shippingAddress: parseShippingAddress(order.shippingAddress),
    buyerStateCode: order.buyerStateCode,
    totals: {
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      tax: order.tax,
      walletApplied: order.walletApplied,
      total: order.total,
    },
    items: itemsSnap.docs.map((d) => {
      const item = d.data() as OrderItemDoc;
      return { id: d.id, sku: item.sku, name: item.name, qty: item.qty, unitPrice: item.unitPrice, lineTax: item.lineTax, lineTotal: item.lineTotal };
    }),
    payments: paymentsSnap.docs.map((d) => {
      const p = d.data() as PaymentDoc;
      return { id: d.id, provider: p.provider, method: p.method, amount: p.amount, status: p.status, createdAt: p.createdAt.toDate().toISOString() };
    }),
    gstInvoice: gst
      ? {
          invoiceNo: gst.invoiceNo,
          placeOfSupply: gst.placeOfSupply,
          isInterState: gst.isInterState,
          taxableValue: gst.taxableValue,
          cgst: gst.cgst,
          sgst: gst.sgst,
          igst: gst.igst,
          total: gst.total,
          pdfPath: gst.pdfPath,
          issuedAt: gst.issuedAt.toDate().toISOString(),
        }
      : null,
  };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;
