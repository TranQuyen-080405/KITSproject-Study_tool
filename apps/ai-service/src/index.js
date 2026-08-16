import "dotenv/config";
import { app } from "./app.js";

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`AI service listening on port ${port}`);
});
