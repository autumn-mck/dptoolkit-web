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

const typeTemplateMap: { [key: string]: string } = {
	text: "text-widget-template",
	title: "title-widget-template",
	image: "image-widget-template",
	slider: "slider-widget-template",
	switch: "switch-widget-template",
	number: "number-widget-template",
};

export class ConfigClass {
	file: { config?: ConfigDefinition };
	widgets: Array<WidgetDefinition> = [];

	constructor(config_object: object) {
		this.file = config_object as { config: ConfigDefinition };
		this.widgets = this.file.config?.widgets || [];
	}

	public get_widgets_html() {
		let html_widgets = this.widgets
			.map((element, index) => {
				const type = element.type;

				if (!(type in typeTemplateMap)) {
					console.error("No template found for type", type);
					return;
				}

				let template = document.getElementById(typeTemplateMap[type]) as HTMLTemplateElement;

				// Create the thing
				let clone = template.content.cloneNode(true) as DocumentFragment;
				if ("text" in element)
					(clone.querySelector(".widget-text") as HTMLElement).innerText = element.text;

				if (type == "switch") {
					(clone.querySelector(".widget-switch-input") as HTMLInputElement).checked = !(
						element.default === "disabled"
					);
				} else if (type == "slider" || type == "number" || type == "value") {
					const inputElement = clone.querySelector(".widget-input") as HTMLInputElement;

					if (element.value.default) inputElement.valueAsNumber = element.value.default;
					if (element.value.range) inputElement.min = element.value.range[0].toString();
					if (element.value.range) inputElement.max = element.value.range[1].toString();

					if (element.value.type) {
						if (element.value.type == "percent") {
							(clone.querySelector(".widget-text") as HTMLElement).innerText += " (%)";
						}
					}
				} else if (type == "image") {
					(clone.querySelector(".widget-image") as HTMLImageElement).src = "";
				}

				// Set input ID
				if (type != "text" && type != "image" && type != "title" && type != "heading") {
					(clone.querySelector(".widget-input") as HTMLInputElement).id =
						"widget-input-" + index.toString();
				}

				return clone;
			})
			.filter((element) => element !== undefined);

		// Return array of HTML elements
		return html_widgets;
	}
}
