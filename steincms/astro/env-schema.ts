import { envField } from 'astro/config';

export const authEnvSchema = {
	SESSION_SECRET: envField.string({ context: 'server', access: 'secret' }),
	AUTH_FILE: envField.string({
		context: 'server',
		access: 'secret',
		optional: true,
		default: 'auth.yaml',
	}),
	TURNSTILE_SECRET_KEY: envField.string({
		context: 'server',
		access: 'secret',
		optional: true,
	}),
};

export const publicEnvSchema = {
	PUBLIC_TURNSTILE_SITEKEY: envField.string({
		context: 'client',
		access: 'public',
		optional: true,
	}),
};
