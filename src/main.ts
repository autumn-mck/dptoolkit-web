import { type Datapack, loadDatapack } from "./datapack";

const fileUploadElement = document.getElementById("input")!;
fileUploadElement.addEventListener("change", onFileUploaded, { passive: true });

async function onFileUploaded(e: Event) {
	const fileList = (e.target as HTMLInputElement).files;
	if (!fileList) return;

	const acceptedTypes = ["application/zip", "application/java-archive"];
	const zipFiles = Array.from(fileList).filter((file) => acceptedTypes.includes(file.type));
	const datapacks = await Promise.all(zipFiles.map(loadDatapack));

	console.log(datapacks);

	const dpDisplayElement = datapacks
		.filter((dp) => dp instanceof Object)
		.map(createDatapackDisplayElement);

	document.getElementById("datapack-display")!.innerHTML = "";
	dpDisplayElement.forEach((element) => {
		document.getElementById("datapack-display")!.appendChild(element);
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
