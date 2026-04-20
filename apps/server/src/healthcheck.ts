const run = async () => {
  const response = await fetch(process.env.APP_URL ? `${process.env.APP_URL}/api/health` : "http://127.0.0.1:8080/api/health");
  if (!response.ok) {
    process.exit(1);
  }
};

run().catch(() => {
  process.exit(1);
});
