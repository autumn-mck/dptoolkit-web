import type { Datapack } from "./datapack";

interface DatapackChange {
	datapack: Datapack;
	file_path: string;
	value_path: string;
	new_value: string | number | boolean;
}

export class DatapackModifier {
	private static instance: DatapackModifier;
	private changeQueue: Array<DatapackChange>;

	public static get Instance() {
		return this.instance || (this.instance = new this());
	}

	constructor() {
		this.changeQueue = [];
	}

	public queueChange(datapack: Datapack, file_path: string, value_path: string, value: number | string | boolean) {
		const change: DatapackChange = {
			datapack: datapack,
			file_path: file_path,
			value_path: value_path,
			new_value: value
		};
		this.changeQueue.push(change);
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
