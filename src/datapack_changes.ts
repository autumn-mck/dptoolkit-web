import type { Datapack } from "./datapack";

interface DatapackChange {
	datapack: Datapack;
	file_path: string;
	value_path: string;
	value: DatapackChangeValue;
	application_method: DatapackChangeMethod;
}

export type DatapackChangeValue = string | number | boolean;

export type DatapackChangeMethod =
	  "multiply" 
	| "divide"
	| "add"
	| "subtract"
	| "set"
	| "multiply_int"
	| "divide_int"
	| "add_int"
	| "subtract_int"
	| "remove"
	| "pop";

export class DatapackModifier {
	private static instance: DatapackModifier;
	private changeQueue: Array<DatapackChange>;

	public static get Instance() {
		return this.instance || (this.instance = new this());
	}

	constructor() {
		this.changeQueue = [];
	}

	/**
	Queue a change to be made to a specific value in a JSON file (or files) in a datapack.
	This change will only be made when datapacks are exported.
	@param datapack
	@param file_path The path to file (or files) using / as the separator. Use with ./ at the beginning to match one specific file.
	@param value_path The path to the value using / as the separator.
	@param value The value must match the method.
	@param method The method to use when applying the change. Use "set" to overwrite the value.
	*/
	public queueChange(datapack: Datapack, file_path: string, value_path: string, value: DatapackChangeValue, method: DatapackChangeMethod) {
		if (valueMatchesMethod(value, method)) {
			const change: DatapackChange = {
				datapack: datapack,
				file_path: file_path,
				value_path: value_path,
				value: value,
				application_method: method
			};
			this.changeQueue.push(change);
		}
		else {
			console.warn(`Datapack change wasn't queued - value ${value} (type <${typeof value}>) doesn't match application method "${method}!"`);
		}
	}

	public async applyChanges() {
		this.changeQueue.forEach(change => {
			this.applyChange(change);
		});
	}

	private async applyChange(change: DatapackChange) {
		if (change.file_path.startsWith("./")) {
			const file_name = change.file_path.slice(2);
			if (file_name in change.datapack.zip.files) {
				const file_text_content = await change.datapack.zip.files[file_name].async("text");
				const content_object = JSON.parse(file_text_content);
				const a = JSON.stringify(applyToValue(
					content_object,
					change.value_path,
					change.value,
					change.application_method
				));
				console.log(a);
				// to-do: uhhh rewrite the file? needs a copy or something
				// maybe create a cache (probably a good idea)
			}
			else {
				console.warn(`File "${file_name}" doesn't exist in "${change.datapack.id}"!`);
			}
		}
		else {
			// to-do: cycle through all files
		}
	}

}

export const DatapackModifierInstance = DatapackModifier.Instance;


const StringMethods: ReadonlyArray<DatapackChangeMethod> = [
	"add",
	"pop",
	"remove",
	"set"
];
const NumberMethods: ReadonlyArray<DatapackChangeMethod> = [
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
const BooleanMethods: ReadonlyArray<DatapackChangeMethod> = [
	"set"
];

function valueMatchesMethod(value: DatapackChangeValue, method: DatapackChangeMethod) {
	if (typeof value === "string" && !StringMethods.includes(method)) {
		return false;
	}
	else if (typeof value === "number" && !NumberMethods.includes(method)) {
		return false;
	}
	else if (typeof value === "boolean" && !BooleanMethods.includes(method)) {
		return false;
	}
	return true;
}

function applyToValue(json: {[key: string]: any}, value_path: string, value: DatapackChangeValue, method: DatapackChangeMethod) {
	const keys = value_path.split("/");
	const error = new Error(`${value_path} doesn't exist in JSON object!`);

	for (let index = 0; index < keys.length - 1; index++) {
		const key = keys[index];
		if (key in json) {
			json = json[key];
		}
		else {
			throw error;
		}
	}
	const last_key = keys[keys.length-1];
	if (!(last_key in json)) {
		throw error;
	}
	else {
		const original_value = json[last_key];
		switch (method) {
			case "set":
				json[last_key] = value;
				break;

			case "add":
				json[last_key] = original_value + value;
				break;
			case "add_int":
				json[last_key] = Math.round(original_value + (value as number));
				break;

			case "subtract":
				json[last_key] = original_value - (value as number);
				break;
			case "subtract_int":
				json[last_key] = Math.round(original_value - (value as number));
				break;

			case "multiply":
				json[last_key] = original_value * (value as number);
				break;
			case "multiply_int":
				json[last_key] = Math.round(original_value * (value as number));
				break;

			case "divide":
				json[last_key] = original_value / (value as number);
				break;
			case "divide_int":
				json[last_key] = Math.round(original_value / (value as number));
				break;

			case "pop":
				let arr = json[last_key] as Array<any>;
				delete arr[value as number];
				json[last_key] = arr;
				break;

			case "remove":
				let a = json[last_key] as Array<any>;
				a = a.filter(
					(element) => {element == value}
				);
				json[last_key] = a;
				break;

			default:
				break;
		}
	}
}