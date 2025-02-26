import path from 'node:path';
import process from 'node:process';
import convict from 'convict';
import convictFormatWithValidator  from 'convict-format-with-validator'; // Adhere to camelCase standards
import dotenv from 'dotenv';

convict.addFormats(convictFormatWithValidator );

const configPath = process.env['CONFIG_PATH']
// simple line is enough, if configPath is undefined then dotenvPath will defer to undefined by default
const dotenvPath = configPath && path.resolve(process.cwd(), configPath); 


if (dotenvPath) {
	// why verify a second time when you can merge all operations in one
	console.log(`Loading env variables from "${dotenvPath}"`);
	// I would have prefered to set dotenv in here to avoid rechecking but I assume you want it to have a default value regardless
	// dotenv.config({ path: dotenvPath });
}

dotenv.config(dotenvPath ? {path: dotenvPath} : undefined);

export {default as dotEnvConvict} from 'convict';
