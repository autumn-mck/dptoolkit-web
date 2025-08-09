import { Modules, type Datapack } from "./datapack";

type Placement = {
	type: string;
	[key: string]: unknown;
};

interface StructureSet {
	id: string;
	modified: boolean;
	type: string;
	placement: Placement;
	originalPlacement: Readonly<Placement>;
}

export function constructStructureSetItem(
	id: string,
	originalPlacement: Readonly<Placement>
): StructureSet {
	// TODO is deleting keys needed

	return {
		id,
		placement: Object.assign({}, originalPlacement),
		originalPlacement,
		modified: false,
		type: originalPlacement.type,
	};
}

export function setStructurePlacement(structure: StructureSet, data: Readonly<Placement>) {
	for (const [key, value] of Object.entries(data)) {
		structure.placement[key] = value;
	}

	structure.modified = true;
}

export function resetStructurePlacement(structure: StructureSet) {
	structure.placement = Object.assign({}, structure.originalPlacement);
	structure.modified = false;
}

export function getStructureDatapacks(datapacks: ReadonlyArray<Datapack>) {
	return datapacks.filter((dp) => dp.modules.has(Modules.STRUCTURE_SET));
}

export function getStructureSets(datapacks: ReadonlyArray<Datapack>) {
	for (const datapack of datapacks) {
		const divider = "/worldgen/structure_set/";
		const files = Object.entries(datapack.zip.files).filter(
			([filePath, _]) => filePath.includes(divider) && filePath.endsWith(".json")
		);

		const structureSets = new Set(
			files.map(([filePath, _]) => filePathToSetName(filePath, divider))
		);

		// const jsons: Record<string, any> = {};

		structureSets.forEach((set) =>
			files.filter((filePath, _) => {
				const splitSet = set.split(":");
				const file = `${splitSet[0]}${divider}${splitSet[1]}.json`;
				return filePath.includes(file);
			})
		);

		console.log(structureSets);
	}
}

function filePathToSetName(filePath: string, div: string) {
	let [prefix, fileName] = filePath.split(div);
	prefix = prefix.split("/").at(-1) ?? "unknown";
	fileName = fileName.replace(".json", "");

	return `${prefix}:${fileName}`;
}
