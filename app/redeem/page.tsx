"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useEffect, useMemo, Suspense } from "react";
import { Toaster, toast } from "react-hot-toast";

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __showToast?: (type: "success" | "error", message: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    OrcuneWidget?: any;
  }
}

function RedemptionPageContent() {
  const searchParams = useSearchParams();
  const voucherCode = searchParams.get("voucherCode");
  const customerId = searchParams.get("customerId");

  // Determine if params are valid
  const isValid = useMemo(() => {
    return !!(voucherCode && customerId);
  }, [voucherCode, customerId]);

  useEffect(() => {
    // Expose toast function to window for use in inline scripts
    window.__showToast = (type, message) => {
      if (type === "success") {
        toast.success(message);
      } else if (type === "error") {
        toast.error(message);
      }
    };
  }, []);

  // Show error toast if params are missing
  useEffect(() => {
    if (!voucherCode || !customerId) {
      toast.error("Missing voucher code or customer ID in URL parameters");
    }
  }, [voucherCode, customerId]);

  // Initialize OrcuneWidget in useEffect to ensure it runs client-side
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Define OrcuneWidget object
    window.OrcuneWidget = {
      init: function (config: Record<string, unknown>) {
        this.apiKey = config.apiKey;
        this.baseUrl = (config.baseUrl as string) || "https://orcune.com";
        this.config = config;
      },

      redeem: async function (voucherCode: string, customerId: string) {
        try {
          const tokenRes = await fetch("/api/create-orcune-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voucherCode, customerId }),
          });

          const data = await tokenRes.json();

          if (!tokenRes.ok) {
            const errorMessage = (data as Record<string, unknown>).error || "Failed to create token";
            throw new Error(errorMessage as string);
          }

          const { redemptionUrl } = data as Record<string, unknown>;

          if (!redemptionUrl) {
            throw new Error("No redemptionUrl returned from backend");
          }

          const popup = window.open(
            redemptionUrl as string,
            "OrcuneRedeem",
            "width=500,height=600,scrollbars=yes",
          );

          if (!popup) {
            throw new Error("Popup was blocked");
          }

          window.addEventListener("message", (event: MessageEvent) => {
            if ((event.data as Record<string, unknown>).type === "ORCUNE_REDEMPTION_COMPLETE") {
              popup.close();
              if ((this.config as Record<string, unknown>).onSuccess) {
                ((this.config as Record<string, unknown>).onSuccess as (voucher: unknown) => void)(
                  (event.data as Record<string, unknown>).voucher,
                );
              }
            }
          });
        } catch (error) {
          if ((this.config as Record<string, unknown>).onError) {
            ((this.config as Record<string, unknown>).onError as (error: unknown) => void)(error);
          }
        }
      },
    };

    // Initialize the widget
    (window.OrcuneWidget as Record<string, (config: Record<string, unknown>) => void>).init({
      onSuccess: function (voucher: unknown) {
        const event = new CustomEvent("redemptionSuccess", { detail: voucher });
        window.dispatchEvent(event);
      },
      onError: function (error: unknown) {
        const event = new CustomEvent("redemptionError", { detail: error });
        window.dispatchEvent(event);
      },
    });

    // Set up event listeners
    const successHandler = () => {
      if (window.__showToast) {
        window.__showToast("success", "Voucher redeemed successfully!");
      }
    };

    const errorHandler = (e: Event) => {
      const customEvent = e as CustomEvent;
      const errorMessage = customEvent.detail?.message || "An error occurred during redemption";
      if (window.__showToast) {
        window.__showToast("error", errorMessage);
      }
    };

    window.addEventListener("redemptionSuccess", successHandler);
    window.addEventListener("redemptionError", errorHandler);

    // Cleanup function
    return () => {
      window.removeEventListener("redemptionSuccess", successHandler);
      window.removeEventListener("redemptionError", errorHandler);
    };
  }, []);

  const handleRedeem = () => {
    if (!voucherCode || !customerId) {
      toast.error("Please provide voucherCode and customerId in URL");
      return;
    }

    if (window.OrcuneWidget) {
      window.OrcuneWidget.redeem(voucherCode, customerId);
    }
  };

  return (
    <>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundImage: "url('/bg-image.png')",
          backgroundSize: "100% auto",
          backgroundPosition: "bottom center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          backgroundColor: "#fff",
        }}>
        {/* Content Container */}
        <div style={{ display: "flex", flexDirection: "column", textAlign: "center" }}>
          {/* Logo Section - Top */}
          <div
            style={{
              width: "100%",
              paddingTop: "17px",
              paddingBottom: "40px",
              display: "flex",
              justifyContent: "center",
              marginTop: "50px",
            }}>
            <Image src="/Logo-voucherPay.png" alt="VoucherPay Logo" width={187} height={52} />
          </div>

          {/* Center Content - Perfectly Centered */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              paddingLeft: "16px",
              paddingRight: "16px",
            }}>
            <div
              style={{
                textAlign: "center",
                maxWidth: "500px",
                width: "100%",
              }}>
              {/* Title */}
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "48px",
                  marginTop: "50px",
                }}>
                Complete Gift Voucher Redemption Process
              </h1>

              {/* Button */}
              <button
                id="redeemBtn"
                onClick={handleRedeem}
                disabled={!isValid}
                style={{
                  width: "100%",
                  paddingLeft: "64px",
                  paddingRight: "64px",
                  paddingTop: "12px",
                  paddingBottom: "12px",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "white",
                  borderRadius: "6px",
                  border: "none",
                  transition: "all 300ms ease",
                  backgroundColor: isValid ? "#4F46E5" : "#9CA3AF",
                  cursor: isValid ? "pointer" : "not-allowed",
                  boxShadow: isValid ? "0 4px 6px rgba(79, 70, 229, 0.3)" : "none",
                  marginBottom: "48px",
                }}>
                {isValid ? "Redeem Gift Card" : "Invalid URL Parameters"}
              </button>

              {/* Warning Box */}
              <div
                style={{
                  backgroundColor: "#F3F8FD",
                  border: "1px solid #DDE3E9",
                  borderRadius: "6px",
                  padding: "16px 24px",
                  fontSize: "14px",
                  color: "#697386",
                  textAlign: "center",
                  lineHeight: "150%",
                  marginBottom: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                }}>
                <span>Please redeem the voucher to avail the merchant&apos;s service.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <>
      <Toaster position="top-center" />
      <Suspense fallback={<div>Loading...</div>}>
        <RedemptionPageContent />
      </Suspense>
    </>
  );
}
