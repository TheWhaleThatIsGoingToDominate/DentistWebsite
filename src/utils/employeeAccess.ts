// TODO: Replace this mock function with a backend API call.
// Future backend should verify the key securely.

export async function checkEmployeeAccessKey(accessKey: string) {
  const response = await fetch("https://clinic-auth.vercel.app/employee/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_key: accessKey,
    }),
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.allowed === true;
}

