const pass = process.env.ADMIN_PASSWORD || '';
const res = await fetch('http://127.0.0.1:4173/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@onlead.local', password: pass }),
});
console.log(res.status, await res.json());
