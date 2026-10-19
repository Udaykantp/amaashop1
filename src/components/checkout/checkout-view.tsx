"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useCart } from "@/store/cart-provider";
import { useToast } from "@/store/toast-provider";
import { placeOrderAction } from "@/actions/checkout";
import { AddressStep, isAddressComplete, type AddressValues } from "@/components/checkout/address-step";
import { DeliveryStep } from "@/components/checkout/delivery-step";
import { PaymentStep, type PaymentMethod } from "@/components/checkout/payment-step";
import { ReviewStep } from "@/components/checkout/review-step";
import { CheckoutOrderSummary } from "@/components/checkout/checkout-order-summary";
import { CheckoutStepper, CHECKOUT_STEPS, type CheckoutStep } from "@/components/checkout/checkout-stepper";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import type { DeliveryOption } from "@/lib/checkout/pricing";

const EMPTY_ADDRESS: AddressValues = { name: "", email: "", phone: "", address: "", city: "", zip: "" };

export function CheckoutView() {
  const { items, subtotal, clearCart } = useCart();
  const { show } = useToast();
  const [step, setStep] = useState<CheckoutStep>("address");
  const [address, setAddress] = useState<AddressValues>(EMPTY_ADDRESS);
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  const currentStepIndex = CHECKOUT_STEPS.findIndex((s) => s.key === step);

  const nextStep = () => {
    if (step === "address" && !isAddressComplete(address)) {
      show("Please fill in all required address fields", "error");
      return;
    }
    const next = CHECKOUT_STEPS[currentStepIndex + 1];
    if (next) setStep(next.key);
  };
  const prevStep = () => {
    const prev = CHECKOUT_STEPS[currentStepIndex - 1];
    if (prev) setStep(prev.key);
  };

  const handlePlaceOrder = () => {
    startTransition(async () => {
      const result = await placeOrderAction({
        ...address,
        deliveryOption,
        items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      });

      if (!result.success) {
        show(result.error, "error");
        return;
      }

      setOrderId(result.orderId);
      clearCart();
      show("Order placed successfully!", "success");
    });
  };

  if (orderId) return <OrderConfirmation orderId={orderId} />;

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-neutral-800">Your cart is empty</h1>
        <p className="mt-2 text-neutral-500">Add some products before checking out.</p>
        <Link href="/shop" className="mt-6 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-0 py-4 lg:px-8 lg:py-8">
      <div className="px-3 lg:px-0">
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-neutral-500 lg:mb-4">
          <ArrowLeft size={16} /> Back to Cart
        </Link>
        <h1 className="mt-2 text-lg font-bold text-neutral-800 lg:mt-0 lg:text-2xl">Checkout</h1>
      </div>

      <CheckoutStepper currentStepIndex={currentStepIndex} />

      <div className="mt-6 grid grid-cols-1 gap-4 px-3 lg:mt-6 lg:grid-cols-3 lg:gap-6 lg:px-0">
        <div className="space-y-4 lg:col-span-2 lg:space-y-6">
          {step === "address" && (
            <AddressStep values={address} onChange={(field, value) => setAddress((prev) => ({ ...prev, [field]: value }))} />
          )}
          {step === "delivery" && <DeliveryStep subtotal={subtotal} value={deliveryOption} onChange={setDeliveryOption} />}
          {step === "payment" && <PaymentStep value={paymentMethod} onChange={setPaymentMethod} />}
          {step === "review" && <ReviewStep items={items} />}

          <div className="flex gap-3">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Back
              </button>
            )}
            {currentStepIndex < CHECKOUT_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-[2] rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="flex-[2] rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {isSubmitting ? "Placing Order..." : "Place Order"}
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <CheckoutOrderSummary items={items} subtotal={subtotal} deliveryOption={deliveryOption} />
        </div>
      </div>
    </div>
  );
}
