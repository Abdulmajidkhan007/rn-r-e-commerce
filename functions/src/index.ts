import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'us-central1' });

export { onOrderCreate } from './triggers/onOrderCreate.js';
export { onOrderUpdate } from './triggers/onOrderUpdate.js';
export { paymeWebhook } from './payments/payme.js';
export { clickWebhook } from './payments/click.js';
