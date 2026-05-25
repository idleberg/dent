import { access, constants } from 'node:fs/promises';

export async function fileExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath, constants.F_OK);
	} catch {
		return false;
	}

	return true;
}

export async function getVersion() {
	const manifest = await import('../package.json', {
		with: { type: 'json' },
	});

	return manifest.default.version ?? 'development';
}
