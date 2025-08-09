interface WidgetDefinition {
	type: string;
	text: string;
	default: string | undefined;
	value: {
		type: string;
		default: number;
		range: [number, number];
	};
}

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
		let html_widgets: Array<DocumentFragment> = [];

		let i = 0;
		this.widgets.forEach((element) => {
			const type = element.type;

			let template = document.getElementById(typeTemplateMap[type]) as HTMLTemplateElement | null;
			if (!template) {
				console.error(`Template not found for type: ${type}`);
				template = document.getElementById("text-widget-template") as HTMLTemplateElement;
			}

			// Create the thing
			let clone = template.content.cloneNode(true) as DocumentFragment;
			(clone.querySelector(".widget-text") as HTMLElement).innerText = element.text;

			if (type == "switch") {
				// if (element.default == "disabled") {
				// 	(clone.querySelector(".widget-switch-input") as HTMLInputElement).checked = false;
				// }
				// else if (element.default == "enabled") {
				// 	(clone.querySelector(".widget-switch-input") as HTMLInputElement).checked = true;
				// }
			} else if (type == "slider" || type == "number" || type == "value") {
				(clone.querySelector(".widget-input") as HTMLInputElement).valueAsNumber =
					element.value.default;
				if (element.value.range)
					(clone.querySelector(".widget-input") as HTMLInputElement).min =
						element.value.range[0].toString();
				if (element.value.range)
					(clone.querySelector(".widget-input") as HTMLInputElement).max =
						element.value.range[1].toString();

				if (element.value.type) {
					if (element.value.type == "percent") {
						(clone.querySelector(".widget-text") as HTMLElement).innerText += " (%)";
					}
				}
			}

			// Set input ID
			if (type != "text" && type != "image" && type != "title" && type != "heading") {
				(clone.querySelector(".widget-input") as HTMLInputElement).id =
					"widget-input-" + i.toString();
			}

			// Push to array
			html_widgets.push(clone);
			i += 1;
		});

		// Return array of HTML elements
		return html_widgets;
	}
}
