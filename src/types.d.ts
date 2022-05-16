export interface scope {
	parentScope: scope;
	[key: string]: any;
}
export interface parameter {
	type: string;
	name: string
}
export interface functionOptions {
	quiet: boolean;
	strict: boolean;
	await: boolean
	warn: boolean;
	[key: string]: any;
}
