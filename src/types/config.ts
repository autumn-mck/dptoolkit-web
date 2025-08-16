import {type DatapackChangeMethod, DatapackChangeMethods} from "./modifications.ts";

export interface ConfigDefinition {
	meta: {
		ver: 1 | 2;
		tab: string;
		id?: string;
	};
	widgets: Array<WidgetDefinition>;
	methods: { [key: string]: ConfigMethod; };
}

////////// WIDGET OBJECT DEFINITIONS //////////

export type InputWidgetDefinition = NumberWidget | SliderWidget | SwitchWidget;
export type WidgetDefinition = TextWidget | ImageWidget | NumberWidget | SliderWidget | SwitchWidget;
export const inputTypes: ReadonlyArray<string> = ["number", "value", "slider", "switch"];

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

export type NumberWidget = {
	type: "number" | "value";
	text: string;
	method?: string;
	methods?: Array<string>;
	slots?: string | string[];

	value: {
		type: "int" | "percent" | "float";
		default: number; // v1 -> v2 change: default MUST be specified
		range: [number, number]; // change: range MUST be specified
		step?: number;
		suffix?: string;
		decimals?: number;
	};

	inputted_value: number;
};

export type SliderWidget = {
	type: "slider";
	text: string;
	method?: string;
	methods?: Array<string>;
	slots?: string | string[];

	value: {
		type: "int" | "percent" | "float";
		default: number; // v1 -> v2 change: default MUST be specified
		range: [number, number]; // change: range MUST be specified
		step?: number;
	};

	inputted_value: number;
};

export type SwitchWidget = {
	type: "switch";
	text: string;
	method?: string;
	methods?: Array<string>;
	slots?: string | string[];

	value: {
		default: 1 | 0; // v1 -> v2 change: default MUST be specified
		enabled_text?: string;
		disabled_text?: string;
	};

	inputted_value: boolean;
};

// CONFIG METHOD
export type ConfigMethod = {
    transformer: Transformer;
    accessors: Array<Accessor>;
}
    // ACCESSOR
    export type Accessor = {
        method: DatapackChangeMethod;
        file_path: string | Array<string>;
        value_path: string;
    };
    export const AccessorMethods: ReadonlyArray<string> = DatapackChangeMethods;

    // TRANSFORMER
    export type Transformer = string | number | IfElseTransformer | MathTransformerWithTwoArgs | MathTransformerWithSingleArg;

    type MathTransformerWithTwoArgs = {
        function: "add" | "multiply";
        argument: Transformer;
        argument1: Transformer;
    }

    type MathTransformerWithSingleArg = {
        function: "int" | "square" | "square_root";
        argument: Transformer;
    }

    type IfElseTransformer = {
        function: "if_else";
        argument: Transformer;
        argument1: Transformer;
        operator: "==" | ">=" | ">";
        true: Transformer;
        false: Transformer;
    }
