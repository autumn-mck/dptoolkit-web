import { type Datapack, loadDatapack } from "./datapack";
import { type DatapackStoreEvents, datapackStore } from "./datapackStore";
import { getStructureSets } from "./structureSet";

const fileUploadElement = document.getElementById("input")!;
fileUploadElement.addEventListener("change", onFileUploaded, { passive: true });
datapackStore.addEventListener("datapacksChanged", updateDatapackDisplay, { passive: true });

async function onFileUploaded(e: Event) {
	const fileList = (e.target as HTMLInputElement).files;
	if (!fileList) return;
	console.time("loadDatapacks");
	const acceptedTypes = [
		"application/zip",
		"application/java-archive",
		"application/x-zip-compressed",
	];
	console.log("Files detected: ");
	console.log(fileList);
	const zipFiles = Array.from(fileList).filter((file) => acceptedTypes.includes(file.type));
	if (zipFiles.length == 0) {
		window.alert("Couldn't load datapack archive, archive may not be a datapack.");
	}
	const datapacks = await Promise.all(zipFiles.map(loadDatapack));
	const validDatapacks = datapacks.filter((dp) => dp instanceof Object);
	console.timeEnd("loadDatapacks");
	console.log(validDatapacks);

	getStructureSets(validDatapacks);

	datapackStore.add(validDatapacks);
}

function updateDatapackDisplay(event: DatapackStoreEvents["datapacksChanged"]) {
	const { detail } = event;
	const dpDisplayElement = detail.map(createDatapackDisplayElement);

	const datapackDisplay = document.getElementById("datapack-display")!;
	datapackDisplay.innerHTML = "";
	dpDisplayElement.forEach((element) => {
		datapackDisplay.appendChild(element);
	});
}

function createDatapackDisplayElement(dp: Datapack): DocumentFragment {
	const template = document.getElementById("datapack-template") as HTMLTemplateElement;
	const clone = template.content.cloneNode(true) as DocumentFragment;

	const { name, description } = getNameAndDescription(dp.mcmeta);

	(clone.querySelector(".name") as HTMLElement).innerHTML = name;
	(clone.querySelector(".description") as HTMLElement).innerHTML = description;

	if (dp.icon) {
		(clone.querySelector("img") as HTMLImageElement).src = URL.createObjectURL(dp.icon);
	}

	return clone;
}

function getNameAndDescription(mcmeta: any): { name: string; description: string } {
	let name = mcmeta.pack.name;
	let description = descriptionToDisplayable(mcmeta.pack.description);

	if (!name) {
		const splitDescription = description.split("\n");
		name = splitDescription[0];
		description = splitDescription.slice(1).join("\n");
	} else {
		name = sanitizeHtml(name);
	}

	// strip colour codes from the name, both easier and more readable
	name = name.replace(/§./g, "");

	if (!description) {
		description = "No description available";
	}

	return { name, description };
}

function descriptionToDisplayable(description: Datapack["description"]): string {
	if (Array.isArray(description))
		return description
			.map((desc) => ({ text: sanitizeHtml(desc.text), color: desc.color }))
			.map((desc) => `<span style="color: ${desc.color}">${desc.text}</span>`)
			.join("");
	else return description;
}

function sanitizeHtml(unsafe: string): string {
	const div = document.createElement("div");
	div.innerText = unsafe;
	return div.innerHTML;
}
