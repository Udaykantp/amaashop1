import "server-only";
import type { OrderStatus, OrderType } from "@/server/enums";

// DATABASE COMMENTED OUT — USING MOCK DATA
/*
import { Collections, db, doc } from "@/server/firestore";
import type { GstInvoiceDoc, OrderDoc, OrderItemDoc, PaymentDoc } from "@/server/models";
*/

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

const MOCK_ADMIN_ORDERS: OrderListRow[] = [
  {
    id: "ord-101",
    orderNo: "AMA-ORD-8821",
    customerName: "Rahul Sharma",
    customerEmail: "rahul.sharma@example.com",
    type: "RETAIL" as OrderType,
    status: "DELIVERED" as OrderStatus,
    total: "623.00",
    itemCount: 2,
    paymentStatus: "PAID",
    createdAt: new Date(Date.now() - 3 * 86400e3).toISOString(),
  },
  {
    id: "ord-102",
    orderNo: "AMA-ORD-9104",
    customerName: "Ananya Iyer",
    customerEmail: "ananya.iyer@example.com",
    type: "DISTRIBUTOR_JOIN" as OrderType,
    status: "PROCESSING" as OrderStatus,
    total: "1249.00",
    itemCount: 3,
    paymentStatus: "PAID",
    createdAt: new Date(Date.now() - 1 * 86400e3).toISOString(),
  },
  {
    id: "ord-103",
    orderNo: "AMA-ORD-9302",
    customerName: "Sanjay Patel",
    customerEmail: "sanjay.p@example.com",
    type: "REPURCHASE" as OrderType,
    status: "PENDING" as OrderStatus,
    total: "845.00",
    itemCount: 1,
    paymentStatus: "AUTHORIZED",
    createdAt: new Date(Date.now() - 6 * 3600e3).toISOString(),
  },
];

export async function listOrders(params: ListOrdersParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(Math.max(params.perPage ?? 20, 5), 100);
  const q = params.q?.trim().toLowerCase();

  let filtered = MOCK_ADMIN_ORDERS;
  if (params.status && params.status !== "ALL") {
    filtered = filtered.filter((o) => o.status === params.status);
  }
  if (params.type && params.type !== "ALL") {
    filtered = filtered.filter((o) => o.type === params.type);
  }
  if (q) {
    filtered = filtered.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q),
    );
  }

  const total = filtered.length;
  const list = filtered.slice((page - 1) * perPage, page * perPage);

  return { list, total, page, perPage, pageCount: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getOrderDetail(id: string) {
  const o = MOCK_ADMIN_ORDERS.find((x) => x.id === id || x.orderNo === id) ?? MOCK_ADMIN_ORDERS[0]!;

  return {
    id: o.id,
    orderNo: o.orderNo,
    type: o.type,
    status: o.status,
    createdAt: o.createdAt,
    confirmedAt: o.createdAt,
    cancelledAt: null,
    customer: {
      name: o.customerName,
      email: o.customerEmail,
      phone: "+91 98765 43210",
      userId: "usr-guest-1",
    },
    placedByMember: { id: "mem-1", memberCode: "AMA-7KQ4MT" },
    shippingAddress: {
      line1: "Flat 402, Green View Apartments",
      line2: "Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
    },
    buyerStateCode: "29",
    totals: {
      subtotal: o.total,
      discount: "0.00",
      shipping: "0.00",
      tax: "0.00",
      walletApplied: "0.00",
      total: o.total,
    },
    items: [
      {
        id: "item-1",
        sku: "AMA-TEA-001",
        name: "AmaaShop Herbal Green Tea",
        qty: 2,
        unitPrice: "199.00",
        lineTax: "0.00",
        lineTotal: "398.00",
      },
    ],
    payments: [
      {
        id: "pay-1",
        provider: "RAZORPAY",
        method: "UPI",
        amount: o.total,
        status: "CAPTURED",
        createdAt: o.createdAt,
      },
    ],
    gstInvoice: {
      invoiceNo: `INV-${o.orderNo}`,
      placeOfSupply: "Karnataka",
      isInterState: false,
      taxableValue: o.total,
      cgst: "0.00",
      sgst: "0.00",
      igst: "0.00",
      total: o.total,
      pdfPath: null,
      issuedAt: o.createdAt,
    },
  };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;
