// Entry point for `npm run hash_password`. Prompts nothing — pass the
// password as an argument: npm run hash_password -- "my-password"
import { hashPassword } from '../steincms/auth/password-hash';

const plain = process.argv[2];
if (!plain) {
	console.error('Usage: npm run hash_password -- "your-password"');
	process.exit(1);
}

console.log(hashPassword(plain));
