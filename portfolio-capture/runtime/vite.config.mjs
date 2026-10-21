import original from '../../restaurant-frontend/vite.config.js'
export default {
  ...original,
  root: new URL('../../restaurant-frontend/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
  server: { host: '127.0.0.1', port: 5181, strictPort: true, proxy: { '/api': 'http://127.0.0.1:8090' } },
}
