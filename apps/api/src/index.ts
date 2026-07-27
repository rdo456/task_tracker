import { app } from "./app";

const port = Number(process.env.API_PORT ?? 3000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
