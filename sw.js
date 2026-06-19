const CACHE_NAME = 'resizer-v2.0.1';

const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
	'./favicon.ico',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Event INSTALL: Menyimpan semua file ke dalam Cache saat PWA diinstal
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Membuka cache dan menyimpan aset offline...');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Event ACTIVATE: Menghapus cache versi lama jika ada pembaruan aplikasi
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Menghapus cache lama:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Event FETCH: Mengambil file dari Cache terlebih dahulu (Cache-First Strategy)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Jika file ditemukan di cache, gunakan itu (berarti sedang offline atau dimuat dari memori)
                if (response) {
                    return response;
                }
                
                // Jika tidak ada di cache, coba ambil dari internet (jika online)
                return fetch(event.request).then(
                    (networkResponse) => {
                        // Jangan cache jika responsnya error
                        if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Simpan file baru ke cache secara dinamis untuk penggunaan berikutnya
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                // Hindari caching request yang memiliki skema chrome-extension atau lainnya
                                if (event.request.url.startsWith('http')) {
                                    cache.put(event.request, responseToCache);
                                }
                            });

                        return networkResponse;
                    }
                );
            }).catch(() => {
                // Jika benar-benar offline dan gagal fetch navigasi halaman, kembalikan index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
    );
});

// Menangani perintah dari tombol "Update App"
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});