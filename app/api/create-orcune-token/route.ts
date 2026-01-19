import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { voucherCode, customerId } = await request.json();

    // Validate inputs
    if (!voucherCode || !customerId) {
      return NextResponse.json({ error: "voucherCode and customerId are required" }, { status: 400 });
    }

    // Get API credentials from environment
    const apiKey = process.env.ORCUNE_API_KEY;
    const apiUrl = process.env.ORCUNE_API_URL;

    if (!apiKey || !apiUrl) {
      return NextResponse.json({ error: "Missing Orcune API configuration" }, { status: 500 });
    }

    // Call Orcune API to create redemption token
    const requestBody = {
      voucherCode,
      customerId,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || "Failed to create redemption token" },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Construct correct redemption URL
    const redemptionUrl = `https://orcune.shop/redeem?token=${data.token}`;

    // Return the token and expiry info to frontend
    return NextResponse.json({
      success: true,
      token: data.token,
      expiresAt: data.expiresAt,
      redemptionUrl: redemptionUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
