import JSZip from "jszip";
import type { Datapack } from "./datapack";

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
	inputted_value: number;
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
	inputted_value: number;
};

type SwitchWidget = {
	type: "switch";
	text: string;
	method?: string;
	slots: string | string[];
	default?: "enabled" | "disabled";
	enabled_text?: string;
	disabled_text?: string;
	inputted_value: boolean;
};

type InputWidgetDefinition = NumberWidget | SliderWidget | SwitchWidget;
type WidgetDefinition = TextWidget | ImageWidget | NumberWidget | SliderWidget | SwitchWidget;

const inputTypes: ReadonlyArray<string> = ["number", "value", "slider", "switch"];

interface ConfigDefinition {
	meta: object;
	widgets: Array<WidgetDefinition>;
}

export class ConfigClass {
	datapack_id: string;
	file: { config?: ConfigDefinition };
	widgets: Array<WidgetDefinition> = [];

	constructor(datapack: Datapack) {
		this.datapack_id = datapack.id;
		this.file = datapack.rawConfig as { config: ConfigDefinition };
		this.widgets = this.file.config?.widgets || [];
	}

	getWidgetList() {
		return this.widgets;
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
					const widgetValue = clone.querySelector(".widget-value-text") as HTMLElement | null;
					if (element.value.default !== undefined) {
						inputElement!.valueAsNumber = element.value.default;

						const suffix = getElementSuffix(element);
						if (widgetValue) {
							widgetValue.innerText = element.value.default.toString() + suffix;
							widgetValue.dataset.suffix = suffix;
						}
					}
					if (element.value.range) {
						inputElement!.min = element.value.range[0].toString();
						inputElement!.max = element.value.range[1].toString();
					}
					if (element.value.step) {
						inputElement!.step = element.value.step.toString();
					}

					inputElement!.addEventListener("input", updateDisplayedValue);

				} else if (type === "image") {
					const imageFile = await zip.file(element.file)?.async("blob");
					if (imageFile) {
						(clone.querySelector(".widget-image") as HTMLImageElement).src =
							URL.createObjectURL(imageFile);
					}
				}

				// Set input ID
				if (inputElement) inputElement.id = "widget-input-" + this.datapack_id.toString() + index.toString();

				return clone;
			})
		);

		// Return array of HTML elements
		return htmlWidgets.filter((element) => element !== undefined);
	}

	// Retrieve values and store them in the widget list
	public retrieveValuesFromPage() {
		const widgets = this.getWidgetList();

		let i = 0;
		widgets.forEach(widget_object => {
			if (inputTypes.includes(widget_object.type))  {
				
				const element_id = "widget-input-" + this.datapack_id.toString() + i.toString();
				console.log(element_id); // this works
				const element_html = document.getElementById(element_id) as HTMLInputElement | null;
				console.log(element_html); // this equals null

				if (element_html != null) {
					(widget_object as InputWidgetDefinition).inputted_value = parseFloat(element_html.value);
				}
			}
			i += 1;
		});
	}

}

function getElementSuffix(element: NumberWidget | SliderWidget) {
	let suffix = "";

	if ("suffix" in element.value && element.value.suffix) {
		suffix = element.value.suffix;
	} else if (element.value.type === "percent") {
		suffix = "%";
	}
	return suffix;
}

function updateDisplayedValue(event: Event) {
	const target = event.target as HTMLInputElement;
	const valueElement = target.parentElement?.querySelector(
		".widget-value-text"
	) as HTMLElement | null;

	let valueToDisplay: string | number = target.valueAsNumber;

	if (Number.parseFloat(target.min) < 0 && valueToDisplay > 0) {
		valueToDisplay = `+${valueToDisplay}`;
	}

	if (valueElement) {
		const suffix = valueElement.dataset.suffix ?? "";
		valueElement.innerText = valueToDisplay.toString() + suffix;
	}
}
