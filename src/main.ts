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
	const acceptedTypes = ["application/zip", "application/java-archive", "application/x-zip-compressed"];
	console.log("Files detected: "); console.log(fileList);
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

	(clone.querySelector(".datapack-name") as HTMLElement).innerText = dp.name;
	(clone.querySelector(".datapack-description") as HTMLElement).innerText =
		descriptionToDisplayable(dp.description);

	if (dp.icon) {
		(clone.querySelector(".datapack-icon") as HTMLImageElement).src = URL.createObjectURL(dp.icon);
	}

	return clone;
}

function descriptionToDisplayable(description: Datapack["description"]): string {
	if (Array.isArray(description)) return description.map((desc) => desc.text).join("");
	else return description;
}
