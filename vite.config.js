// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";

const manifest = {
  manifest_version: 3,
  name: "Moodle Quiz Assistant",
  version: "1.0.0",
  description: "Assistant pour les tests Moodle",
  permissions: ["activeTab", "storage"],
  action: {
    default_popup: "index.html",
  },
  background: {
    service_worker: "src/background.js",
    type: "module",
  },
  content_scripts: [
    {
      matches: [
        "https://moodle.myefrei.fr/*",
        "https://sandbox404.moodledemo.net/*",
        "https://sandbox.moodledemo.net/*",
      ],
      js: ["src/content.js"],
    },
  ],
  host_permissions: [
    "https://api.anthropic.com/*",
    "https://moodle.myefrei.fr/*",
    "https://sandbox404.moodledemo.net/*",
    "https://sandbox.moodledemo.net/*",
  ],
};

export default defineConfig({
  plugins: [react(), crx({ manifest })],
});
