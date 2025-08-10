import JSZip from "jszip";
import { ConfigClass, getWidgetsHtml } from "./config";

export interface Datapack {
	id: string;
	name: string | undefined;
	description:
		| string
		| {
				text: string;
				color: string;
		  }[];
	icon: Blob | undefined;
	mcmeta: Record<string, unknown>;
	zip: JSZip;
	config: unknown | undefined;
	configObject: undefined | ConfigClass;
	modules: Set<Module>;
}

export const Modules = {
	STRUCTURE_SET: "structure_set",
	BIOME: "biome",
	OVERWORLD: "overworld",
	DPCONFIG: "dpconfig",
} as const;
type Module = (typeof Modules)[keyof typeof Modules];

export async function loadDatapack(file: File): Promise<Datapack | string> {
	const jsZip = new JSZip();
	const zip = await jsZip.loadAsync(file);

	const mcmetaText = await zip.file("pack.mcmeta")?.async("string");
	if (!mcmetaText) {
		return "Could not load pack.mcmeta. Archive is not a datapack!!! >:(";
	}

	let mcmeta;
	try {
		mcmeta = JSON.parse(mcmetaText);
	} catch (error) {
		return "Failed to parse pack.mcmeta";
	}

	const icon = await zip.file("pack.png")?.async("blob");

	const modules = detectModules(zip);

	let config = {};
	if (modules.has(Modules.DPCONFIG)) config = await loadDpConfig(zip);

	let configObject = new ConfigClass(config);

	writeConfigWidgetsToDocument(configObject, zip);

	return {
		id: mcmeta.pack.id || file.name,
		name: mcmeta.pack.name,
		description: mcmeta.pack.description,
		icon,
		mcmeta,
		config,
		configObject,
		zip,
		modules,
	};
}

async function loadDpConfig(datapackZip: JSZip): Promise<Object> {
	const dpConfigText = await datapackZip.file("dpconfig.json")?.async("string");
	if (dpConfigText) return JSON.parse(dpConfigText);
	else return {};
}

function detectModules(datapackZip: JSZip): Set<Module> {
	const modules = new Set<Module>();

	const matchers: Record<string, Module> = {
		"/structure_set/": Modules.STRUCTURE_SET,
		"/worldgen/biome/": Modules.BIOME,
		"minecraft/dimension/overworld.json": Modules.OVERWORLD,
		"dpconfig.json": Modules.DPCONFIG,
	};

	datapackZip.forEach((relativePath, _) => {
		Object.entries(matchers).forEach(([pattern, mod]) => {
			if (relativePath.includes(pattern)) modules.add(mod);
		});
	});

	return modules;
}

async function writeConfigWidgetsToDocument(configObject: ConfigClass, zip: JSZip) {
	const widgets: Array<DocumentFragment> = await getWidgetsHtml(configObject, zip);
	const screen = document.getElementById("config-screen")!;
	widgets.forEach((element) => {
		screen.appendChild(element);
	});
}
