import "dotenv/config";
const { createApp } = await import("./app.js");
const port = Number(process.env.PORT ?? 3001);
createApp().listen(port, () => console.log(`API on http://localhost:${port}`));
