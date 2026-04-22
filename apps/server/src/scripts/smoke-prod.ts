const requireEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
};

const baseUrl = requireEnv("SMOKE_BASE_URL").replace(/\/+$/, "");
const smokeEmail = process.env.SMOKE_EMAIL?.trim();
const smokePassword = process.env.SMOKE_PASSWORD?.trim();

if ((smokeEmail && !smokePassword) || (!smokeEmail && smokePassword)) {
  throw new Error("SMOKE_EMAIL and SMOKE_PASSWORD must either both be set or both be empty");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const run = async () => {
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  assert(healthResponse.ok, `Health check failed with status ${healthResponse.status}`);

  const healthPayload = await healthResponse.json() as { ok?: boolean };
  assert(healthPayload.ok, "Health payload missing ok=true");
  console.log("Smoke OK: health endpoint");

  const homeResponse = await fetch(`${baseUrl}/`);
  assert(homeResponse.ok, `Home page failed with status ${homeResponse.status}`);

  const homeHtml = await homeResponse.text();
  assert(
    homeHtml.includes("<div id=\"root\"></div>") || homeHtml.includes("Classic Chat MVP"),
    "Home page HTML does not look like the app shell"
  );
  console.log("Smoke OK: app shell");

  if (smokeEmail && smokePassword) {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        email: smokeEmail,
        password: smokePassword
      })
    });

    assert(loginResponse.ok, `Login failed with status ${loginResponse.status}`);
    const setCookie = loginResponse.headers.get("set-cookie");
    assert(Boolean(setCookie), "Login response did not set a session cookie");

    const loginPayload = await loginResponse.json() as { user?: { email?: string } };
    assert(loginPayload.user?.email === smokeEmail, "Login returned unexpected session payload");
    console.log("Smoke OK: authenticated login");
  } else {
    console.log("Smoke INFO: login check skipped because SMOKE_EMAIL/SMOKE_PASSWORD were not set");
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
