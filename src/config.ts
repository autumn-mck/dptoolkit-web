export class ConfigClass {
	file: object;
	widgets: object = {};

	constructor(config_object: object) {
		this.file = config_object;
	}

	public get_widgets() {
		return this.file.config.widgets;
	}
}
