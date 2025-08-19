import type { ModrinthProject } from "../types/modrinth_api";

const SupportedPacks: ReadonlyArray<string> = [
	"geophilic",
	"explorify"
]

async function getSupportedPacks() {
	let a = [];
	console.info("Fetching data from Modrinth...");
	for (const slug of SupportedPacks) {
		const response = await fetch(
			`https://api.modrinth.com/v2/project/${slug}`
		);
		const info = await response.json() as ModrinthProject;
		a.push(info);
	}
	return a;
}

export async function generateDatapackBrowser() {
	const list_widget = document.querySelector(".pack-download-list");
	if (!list_widget) throw new Error();

	const entries: ModrinthProject[] = await getSupportedPacks();
	for (const pack of entries) {
		let temp = document.getElementById("PACK-DOWNLOAD-ITEM-TEMPLATE") as HTMLTemplateElement;
		console.log(temp);
		let html_entry = temp.content.firstChild!.cloneNode(true) as HTMLLabelElement;
		
		html_entry.id = pack.slug;
		html_entry.htmlFor = pack.slug;
		(html_entry.querySelector("img") as HTMLImageElement)!.src = pack.icon_url;
		(html_entry.querySelector(".-name") as HTMLSpanElement)!.innerText = pack.title;
		(html_entry.querySelector(".-author") as HTMLSpanElement)!.innerText = "unknown";
		(html_entry.querySelector(".-desc") as HTMLSpanElement)!.innerText = pack.description;
		(html_entry.querySelector("input") as HTMLInputElement)!.id = pack.slug;

		list_widget.appendChild(html_entry);
	}
}
