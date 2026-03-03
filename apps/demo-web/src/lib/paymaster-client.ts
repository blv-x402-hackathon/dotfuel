export async function fetchTokenQuote(payload: unknown) {
  const baseUrl = process.env.NEXT_PUBLIC_PAYMASTER_API_URL ?? "http://localhost:3001";
  const res = await fetch(`${baseUrl}/v1/quote/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "failed to fetch token quote");
  }

  return res.json();
}

export async function fetchSponsorQuote(payload: unknown) {
  const baseUrl = process.env.NEXT_PUBLIC_PAYMASTER_API_URL ?? "http://localhost:3001";
  const res = await fetch(`${baseUrl}/v1/quote/sponsor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "failed to fetch sponsor quote");
  }

  return res.json();
}
