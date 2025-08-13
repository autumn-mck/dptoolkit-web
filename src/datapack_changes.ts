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
		console.log(change);
	}

}

export const DatapackModifierInstance = DatapackModifier.Instance;


const string_methods: ReadonlyArray<DatapackChangeMethod> = [
	"add",
	"pop",
	"remove",
	"set"
];

const number_methods: ReadonlyArray<DatapackChangeMethod> = [
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

const boolean_methods: ReadonlyArray<DatapackChangeMethod> = [
	"set"
];

function valueMatchesMethod(value: DatapackChangeValue, method: DatapackChangeMethod) {
	if (typeof value === "string" && !string_methods.includes(method)) {
		return false;
	}
	else if (typeof value === "number" && !number_methods.includes(method)) {
		return false;
	}
	else if (typeof value === "boolean" && !boolean_methods.includes(method)) {
		return false;
	}
	return true;
}