import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: [
        "src/lib/film.ts",
        "src/lib/join-schema.ts",
        "src/lib/members.ts",
        "src/lib/guild.ts",
      ],
      reporter: ["text", "text-summary"],
    },
  },
});
