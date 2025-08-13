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
	datapack: Datapack;
	datapack_id: string;
	file: { config?: ConfigDefinition };
	widgets: Array<WidgetDefinition> = [];

	constructor(datapack: Datapack) {
		this.datapack = datapack;
		this.datapack_id = datapack.id;
		this.file = datapack.rawConfig as { config: ConfigDefinition };
		this.widgets = this.file.config?.widgets || [];
	}

	getWidgetList() {
		return this.widgets;
	}

	stuff() {
		dostuff;
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


////////// ACCESSOR LOGIC //////////

type Accessor = {
	method: string;
	file_path: string;
	value_path: string;
};

const AccessorMethods: ReadonlyArray<string> = [
	"multiply",
	"divide",
	"add",
	"subtract",
	"set",
	"multiply_int",
	"divide_int",
	"add_int",
	"subtract_int",
	"remove",
	"pop"
];

///// ACCESSOR FUNCTIONS /////

function readAccessors(datapack: Datapack, accessor_list: Array<object>): Array<Accessor> {
	let refined_accessor_list = accessor_list.map(
		(accessor) => {
			return asAccessor(datapack, accessor);
		}
	) as Array<Accessor | null>;

	refined_accessor_list = refined_accessor_list.filter(
		(accessor) => accessor != null);

	return refined_accessor_list as Array<Accessor>;
}

function asAccessor(datapack: Datapack, accessor: object) {
	if (accessorIsValid(datapack, accessor)) {
		return accessor as Accessor;
	}
	else return null;
}

function accessorIsValid(datapack: Datapack, accessor: object) {
	if ("method" in accessor && "file_path" in accessor && "value_path" in accessor) {
		if (AccessorMethods.includes(accessor["method"] as string)) {
			const files = findMatchingFiles(datapack, accessor["file_path"] as string);
			if (files.length != 0) {
				return true;
			}
		}
	}
	return false;
}

function findMatchingFiles(datapack: Datapack, file_path: string) {
	let file_names: Array<string> = [];

	for (const key in datapack.zip.files) {
		if (Object.prototype.hasOwnProperty.call(datapack.zip.files, key)) {
			if (key.includes(file_path)) {
				file_names.push(key);
			}
		}
	}
	return file_names;
}


////////// TRANSFORMER LOGIC //////////

type Transformer = string | number | ifElseTransformer | mathTransformerTwoArgs | mathTransformerSingleArg;

type mathTransformerTwoArgs = {
	function: "add" | "multiply";
	argument: Transformer;
	argument1: Transformer;
}

type mathTransformerSingleArg = {
	function: "int" | "square" | "square_root";
	argument: Transformer;
}

type ifElseTransformer = {
	function: "if_else";
	argument: Transformer;
	argument1: Transformer;
	operator: "==" | ">=" | ">";
	true: Transformer;
	false: Transformer;
}

function processTransformer(method_input: number, slot_values: {[key: string]: number}, transformer: Transformer): string | number {

	if (typeof transformer === "number") {
		return transformer as number;
	}

	else if (typeof transformer === "string") {
		if (transformer.charAt(0) == "$" || transformer == "input") {
			if (transformer == "$input" || transformer == "$in" || transformer == "input") {
				return method_input;
			}
			else {
				const variable = transformer.slice(1);
				if (variable in slot_values) {
					return slot_values[variable];
				}
			}
		}
		return transformer as string;
	}

	else {
		switch (transformer.function) {
			// Math transformers with two arguments
			case "add":
				return (processTransformer(method_input, slot_values, transformer.argument) as number) + (processTransformer(method_input, slot_values, transformer.argument1) as number);
			
			case "multiply":
				return (processTransformer(method_input, slot_values, transformer.argument) as number) * (processTransformer(method_input, slot_values, transformer.argument1) as number);

			// Math transformers with a single argument
			case "int": 
				return Math.round(processTransformer(method_input, slot_values, transformer.argument) as number);
				
			case "square_root": 
				return Math.sqrt(processTransformer(method_input, slot_values, transformer.argument) as number);

			case "square": 
				return Math.pow(processTransformer(method_input, slot_values, transformer.argument) as number, 2);

			// if-else transformer
			case "if_else":
				if (transformer.operator == "==") {
					if (transformer.argument == transformer.argument1) return processTransformer(method_input, slot_values, transformer.true);
					else return processTransformer(method_input, slot_values, transformer.false);
				}

				else if (transformer.operator == ">=") {
					if (transformer.argument >= transformer.argument1) return processTransformer(method_input, slot_values, transformer.true);
					else return processTransformer(method_input, slot_values, transformer.false);
				}

				else if (transformer.operator == ">") {
					if (transformer.argument > transformer.argument1) return processTransformer(method_input, slot_values, transformer.true);
					else return processTransformer(method_input, slot_values, transformer.false);
				}

				throw new Error("Couldn't process if-else transformer");

			default:
				throw new Error("Couldn't process unknown transformer");
		}
	}
}

////////// METHOD LOGIC //////////

type Method = {
	transformer: Transformer;
	accessors: Array<Accessor>;
}

async function dostuff(datapack: Datapack, method: Method) {
	const final_value = processTransformer(
		0,
		{},
		method.transformer
	);
	const accessors = readAccessors(
		datapack,
		method.accessors
	);

	await accessors.forEach(async accessor => {
		const files = findMatchingFiles(datapack, accessor.file_path);

		await files.forEach(async file_name => {
			const content = await datapack.zip.files[file_name].async("text");
			JSON.parse(content);
		});

	});

}