interface WidgetDefinition {
	type: string;
	text: string;
}

export class ConfigClass {
	file: object;
	widgets: Array<WidgetDefinition> = [];

	constructor(config_object: object) {
		this.file = config_object;
		this.widgets = this.file.config.widgets;
	}

	public get_widgets() {
		let html_widgets: Array<DocumentFragment> = [];

		this.widgets.forEach(element => {
			const type = element.type;

			let template = document.getElementById("text-widget-template") as HTMLTemplateElement;

			// Get correct template
			switch (type) {
				case "heading":
					template = document.getElementById("title-widget-template") as HTMLTemplateElement;
					break;
				case "title":
					template = document.getElementById("title-widget-template") as HTMLTemplateElement;
					break;
				case "text":
					template = document.getElementById("text-widget-template") as HTMLTemplateElement;
					break;
				case "image":
					template = document.getElementById("image-widget-template") as HTMLTemplateElement;
					break;
				case "switch":
					template = document.getElementById("switch-widget-template") as HTMLTemplateElement;
					break;
				case "number":
					template = document.getElementById("number-widget-template") as HTMLTemplateElement;
					break;
				case "slider":
					template = document.getElementById("slider-widget-template") as HTMLTemplateElement;
					break;
			}

			// Create the thing
			let clone = template.content.cloneNode(true) as DocumentFragment;
			(clone.querySelector(".widget-text") as HTMLElement).innerText = element.text;

			if (type == "switch") {
				if (element.default == "disabled") {
					(clone.querySelector(".widget-switch-input") as HTMLInputElement).checked = false;
				}
				else if (element.default == "enabled") {
					(clone.querySelector(".widget-switch-input") as HTMLInputElement).checked = true;
				}
			}

			html_widgets.push(clone);

		});

		// Return array of HTML elements
		return html_widgets;
	}
}
