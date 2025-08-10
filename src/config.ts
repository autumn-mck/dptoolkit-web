import JSZip from "jszip";

type TextWidget = {
	type: "title" | "heading" | "text";
	text: string;
};

type ImageWidget = {
	type: "image";
	file: string;
	width?: number;
	height?: number;
};

type NumberWidget = {
	type: "number" | "value";
	text: string;
	value: {
		type: "int" | "percent" | "float";
		default?: number;
		range?: [number, number];
		step?: number;
		suffix?: string;
		decimals?: number;
	};
	method: string;
	slots: string | string[];
};

type SliderWidget = {
	type: "slider";
	value: {
		type: "int" | "percent" | "float";
		default?: number;
		range?: [number, number];
		step?: number;
	};
	method: string;
	slots: string | string[];
};

type SwitchWidget = {
	type: "switch";
	text: string;
	method?: string;
	slots: string | string[];
	default?: "enabled" | "disabled";
	enabled_text?: string;
	disabled_text?: string;
};

type WidgetDefinition = TextWidget | ImageWidget | NumberWidget | SliderWidget | SwitchWidget;

interface ConfigDefinition {
	meta: object;
	widgets: Array<WidgetDefinition>;
}

export class ConfigClass {
	file: { config?: ConfigDefinition };
	widgets: Array<WidgetDefinition> = [];

	constructor(config_object: object) {
		this.file = config_object as { config: ConfigDefinition };
		this.widgets = this.file.config?.widgets || [];
	}

	async getWidgetsHtml(zip: JSZip) {
		let htmlWidgets = await Promise.all(
			this.widgets.map(async (element, index) => {
				const type = element.type;

				// Create the thing
				const templateId = `${type}-widget-template`;
				let template = document.getElementById(templateId) as HTMLTemplateElement | null;

				if (!template) {
					console.error("No template found for type", type);
					return;
				}
				let clone = template.content.cloneNode(true) as DocumentFragment;

				const widgetText = clone.querySelector(".widget-text") as HTMLElement | null;
				const inputElement = clone.querySelector(".widget-input") as HTMLInputElement | null;

				if ("text" in element && widgetText) widgetText.innerText = element.text;

				if (type === "switch") {
					(clone.querySelector(".widget-switch-input") as HTMLInputElement).checked = !(
						element.default === "disabled"
					);
				} else if (type === "slider" || type === "number" || type === "value") {
					if (element.value.default !== undefined) {
						inputElement!.valueAsNumber = element.value.default;
					}
					if (element.value.range) {
						inputElement!.min = element.value.range[0].toString();
						inputElement!.max = element.value.range[1].toString();
					}
					if (element.value.step) {
						inputElement!.step = element.value.step.toString();
					}

					let suffix = "";

					if ("suffix" in element.value && element.value.suffix) {
						suffix = element.value.suffix;
					} else if (element.value.type === "percent") {
						suffix = " (%)";
					}

					if (suffix && widgetText) widgetText.innerText += suffix;
				} else if (type === "image") {
					const imageFile = await zip.file(element.file)?.async("blob");
					if (imageFile) {
						(clone.querySelector(".widget-image") as HTMLImageElement).src =
							URL.createObjectURL(imageFile);
					}
				}

				// Set input ID
				if (inputElement) inputElement.id = "widget-input-" + index.toString();

				return clone;
			})
		);

		// Return array of HTML elements
		return htmlWidgets.filter((element) => element !== undefined);
	}
}
