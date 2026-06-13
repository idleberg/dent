declare module '*.json' {
	// biome-ignore lint/suspicious/noExplicitAny: any JSON import is fine
	const value: any;
	export default value;
}
