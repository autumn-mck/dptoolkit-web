import { defineConfig } from "vite";
import handlebars from "vite-plugin-handlebars";
import path from "node:path";

export default defineConfig({
	base: "/dptoolkit-web/",
	plugins: [
		handlebars({
			partialDirectory: path.resolve("./partials"),
		}),
	],
});
