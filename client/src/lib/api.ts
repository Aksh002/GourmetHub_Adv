type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export async function apiRequest(method: HttpMethod, endpoint: string, body?: any) {
  const response = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response;
} 