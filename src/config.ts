import JSZip from "jszip";
import DOMPurify from "dompurify";
import type {Datapack} from "./datapack";
import {DatapackModifierInstance} from "./datapack_changes";
import {
    type Accessor,
    AccessorMethods,
    type ConfigDefinition,
    inputTypes,
    type InputWidgetDefinition,
    type ConfigMethod,
    type NumberWidget,
    type SliderWidget,
    type SwitchWidget,
    type Transformer,
    type WidgetDefinition
} from "./types/config";
import type {DatapackChangeMethod, DatapackChangeValue} from "./types/modifications.ts";

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

	private getWidgetList() {
		return this.widgets;
	}

	public async getWidgetsHtml(zip: JSZip) {
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

				if ("text" in element && widgetText) {
					const sanitized_html = DOMPurify.sanitize(element.text);
					widgetText.innerHTML = sanitized_html;
				}

				if (type === "switch") {
					(clone.querySelector(".widget-switch-input") as HTMLInputElement).checked = !(
						element.value.default == 0
					);
				} else if (type === "slider" || type === "number") {
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
				if (inputElement) {
					const id = "widget-input-" + this.datapack_id.toString() + index.toString();
					const label = clone.querySelector("label") as HTMLLabelElement;

					inputElement.id = id;
					label.setAttribute("for", id);
				}

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
				const element_html = document.getElementById(element_id) as HTMLInputElement | null;

				if (element_html != null) {
					if (widget_object.type !== "switch") {
						(widget_object as InputWidgetDefinition).inputted_value = parseFloat(element_html.value);
					}
					else {
						(widget_object as SwitchWidget).inputted_value = element_html.checked;
					}
				}
			}
			i += 1;
		});
	}

	public apply() {
		this.retrieveValuesFromPage();
		const methods = this.file.config?.methods;

		for (const method_name in methods) {
			if (Object.prototype.hasOwnProperty.call(methods, method_name)) {
				const method = methods[method_name];

				let input_value: any = null;
				let default_value: any = null;
				let slots: {[key: string]: any} = {};

				this.getWidgetList().forEach(widget => {
					if (inputTypes.includes(widget.type) && "inputted_value" in widget) {
						default_value = (widget as InputWidgetDefinition).value.default;

						if (widget.inputted_value != default_value) {
							let val = widget.inputted_value;

							if (widget.type === "slider" && widget.value.type === "percent") {
								val = (val as number) / 100;
							}

							// Method input
							if ("method" in widget) {
								if (widget.method == method_name) {
									input_value = val;
								}
							}
							else if ("methods" in widget) {
								if (widget.methods?.includes(method_name)) {
									input_value = val;
								}
							}
							else {
								input_value = undefined;
							}

							// Slots
							if ("slots" in widget && widget.slots != undefined) {
								if (typeof widget.slots === "string") {
									slots[widget.slots] = val;
								}
								else {
									widget.slots.forEach(element => {
										slots[element] = val;
									});
								}
							}
						}
					}
				});

				if (input_value === null) {
					console.log(`[DPConfig] Input value is null, so not applying method ${this.datapack_id}:${method_name}`);
				}
				else {
					applyMethodAsChangeToPack(
						this.datapack,
						method,
						input_value,
						slots
					);
				}
			}
		}
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

//////////////////// ACCESSOR LOGIC ////////////////////

function readAccessors(accessor_list: Array<object>): Array<Accessor> {
	let refined_accessor_list = accessor_list.map(
		(accessor) => {
			return asAccessor(accessor);
		}
	) as Array<Accessor | null>;

	refined_accessor_list = refined_accessor_list.filter(
		(accessor) => accessor != null);

	return refined_accessor_list as Array<Accessor>;
}

function asAccessor(accessor: object) {
	if (accessorIsValid(accessor)) {
		return accessor as Accessor;
	}
	else return null;
}

function accessorIsValid(accessor: object) {
	if ("method" in accessor && "file_path" in accessor && "value_path" in accessor) {
		if (AccessorMethods.includes(accessor["method"] as string)) {
			return true;
		}
	}
	return false;
}

////////// TRANSFORMER LOGIC //////////

function processTransformer(method_input: number | boolean | undefined, slot_values: {[key: string]: any}, transformer: Transformer): DatapackChangeValue {

	if (typeof transformer === "number") {
		return transformer;
	}

	else if (typeof transformer === "string") {
		if (transformer.charAt(0) == "$" || transformer == "input") {
			if (transformer == "$input" || transformer == "$in" || transformer == "input") {
				if (method_input === undefined) {
					throw new Error("Trying to access undefined method input?");
				}
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

	else if (typeof transformer === "object") {
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
	else throw new Error("Couldn't process undefined transformer!");
}

////////// METHOD LOGIC //////////

function applyMethodAsChangeToPack(datapack: Datapack, method: ConfigMethod, method_input: any, slots: object) {
	const final_value = processTransformer(
		method_input,
		slots,
		method.transformer
	);
	const accessors = readAccessors(
		method.accessors
	);
	accessors.forEach(accessor => {
		if (typeof accessor.file_path === "string") {
			DatapackModifierInstance.queueChange(
				datapack, accessor.file_path, accessor.value_path, final_value, accessor.method as DatapackChangeMethod
			);
		}
		else {
			accessor.file_path.forEach(single_path => {
				DatapackModifierInstance.queueChange(
					datapack, single_path, accessor.value_path, final_value, accessor.method as DatapackChangeMethod
				);
			});
		}
	});
}