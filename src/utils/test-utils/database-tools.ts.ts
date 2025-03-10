import {rm} from 'node:fs/promises';
import {exec as execCallback} from 'node:child_process';
import {promisify} from 'node:util';
import SqliteDatabase from 'better-sqlite3';
import {drizzle} from 'drizzle-orm/better-sqlite3';
import {
	uniqueNamesGenerator, adjectives, colors, animals,
} from 'unique-names-generator';
import fg from 'fast-glob';
import * as schema from '@/db/schema.js';

const exec = promisify(execCallback);

export const UNIT_TEST_DB_PREFIX = './unit-test-';

export async function cleanAllLooseDatabases(prefix: string) {
	const entries = await fg([`${prefix}*.db`]);
	await Promise.all(entries.map(async entry => cleanUp(entry)));
}

export async function cleanUp(databaseName: string) {
	try {
        const sqlite = new SqliteDatabase(databaseName);
        sqlite.close();
        await new Promise(resolve => setTimeout(resolve, 100));
        await rm(databaseName, { force: true }); // for some reason this doesn't force the removal so i had to manually close the db
		// for the file to be removed
    } catch (error) {
        console.error(`Error cleaning up database ${databaseName}:`, error);
    }
}

export async function createDatabaseMock() {
	const randomName = uniqueNamesGenerator({dictionaries: [adjectives, colors, animals]}); // Big_red_donkey (you could have went with something cute)
	const databaseName = `${UNIT_TEST_DB_PREFIX}${randomName}.db`;
	const sqlite = new SqliteDatabase(databaseName);
	await exec(`pnpm drizzle-kit push --schema=src/db/schema.ts --dialect=sqlite --url=${databaseName}`);

	const databaseMock = drizzle(sqlite, {
		schema,
	});
	return {databaseMock, databaseName};
}
