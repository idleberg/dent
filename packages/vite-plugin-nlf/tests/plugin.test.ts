import { describe, expect, it } from 'vitest';
import Arabic from './fixtures/Arabic.nlf';
import English from './fixtures/English.nlf';
import German from './fixtures/German.nlf';

describe('NLF Plugin', () => {
	it('should parse English fixture', () => {
		expect(English).toHaveProperty('header');
		expect(English).toHaveProperty('id', 1033);
		expect(English).toHaveProperty('font');
		expect(English).toHaveProperty('rtl', false);
		expect(English).toHaveProperty('strings');
		expect(Object.keys(English.strings).length).toBeGreaterThan(0);
	});

	it('should parse German fixture', () => {
		expect(German).toHaveProperty('id', 1031);
		expect(German).toHaveProperty('code_page', 1252);
		expect(German).toHaveProperty('rtl', false);
		expect(Object.keys(German.strings).length).toBeGreaterThan(0);
	});

	it('should parse RTL language', () => {
		expect(Arabic).toHaveProperty('id', 1025);
		expect(Arabic).toHaveProperty('rtl', true);
	});
});
