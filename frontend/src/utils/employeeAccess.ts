export type EmployeeLoginCredentials = {
  username: string
  phone_number: string
  password: string
}

export async function checkEmployeeAccessKey(credentials: EmployeeLoginCredentials) {
  const response = await fetch('https://clinic-auth.vercel.app/employee/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    return false
  }

  const data = await response.json()
  return data.allowed === true
}

