export function webhookHeaders(url, token) {
  const headers = {'X-Statement-Key': token};
  if (['ngrok-free.dev', 'ngrok-free.app', 'ngrok.app', 'ngrok.io'].some(domain => url.hostname.endsWith('.' + domain))) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }
  return headers;
}
