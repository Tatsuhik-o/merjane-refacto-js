import path from 'node:path';
import process from 'node:process';
import convict from 'convict';
import convictFormatWithValidator  from 'convict-format-with-validator'; // Adhere to camelCase standards
import dotenv from 'dotenv';

convict.addFormats(convictFormatWithValidator );

const configPath = process.env['CONFIG_PATH']
// simple statemnt is enough if configPath is undefined then 
// dotenvPath infer that from it otherwise it moves to second statement
const dotenvPath = configPath && path.resolve(process.cwd(), configPath); 


if (dotenvPath) {
	// why verify a second time when you can merge all operations in one
	console.log(`Loading env variables from "${dotenvPath}"`);
	dotenv.config({ path: dotenvPath });
}

export {default as dotEnvConvict} from 'convict';
