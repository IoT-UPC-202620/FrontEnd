const { chromium } = require('playwright');

// JWT falso con exp en 2030. El guard solo valida expiración, no firma.
const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(
  JSON.stringify({ sub: '1', email: 'admin@edifika.com', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 })
).toString('base64url');
const fakeToken = `${header}.${payload}.`;

const fakeUser = JSON.stringify({
  id: 1,
  email: 'admin@edifika.com',
  fullName: 'Administrador',
  roles: [{ id: 1, name: 'ADMIN' }],
  token: fakeToken
});

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const variants = [
    { key: 'A', file: 'prototype-variant-A.png', url: 'http://localhost:4200/app/smart-iot?variant=A' },
    { key: 'B', file: 'prototype-variant-B.png', url: 'http://localhost:4200/app/smart-iot?variant=B' },
    { key: 'C', file: 'prototype-variant-C.png', url: 'http://localhost:4200/app/smart-iot?variant=C' },
  ];

  for (const v of variants) {
    // Inyectar sesión antes de navegar para sortear el authGuard
    await page.goto('http://localhost:4200/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('edifika_token', token);
      localStorage.setItem('edifika_user', user);
    }, { token: fakeToken, user: fakeUser });

    await page.goto(v.url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(800); // deja asentar animaciones/render
    await page.screenshot({ path: v.file, fullPage: true });
    console.log(`Captura guardada: ${v.file} (${v.url})`);
  }

  await browser.close();
  console.log('Todas las capturas se guardaron.');
})();
