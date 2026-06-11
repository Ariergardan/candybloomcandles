CandyBloom v5.7 — panel admina pod Cloudflare Pages

Co zmieniono:
- zapis z panelu admina został przepięty z Netlify Functions na Cloudflare Pages Functions,
- nowy endpoint zapisu: /api/save-store,
- dodano functions/api/save-store.js,
- usunięto pliki Netlify z paczki, żeby nie mieszały konfiguracji.

Po wgraniu na GitHub:
1. Cloudflare Pages samo zrobi deploy.
2. W Cloudflare wejdź:
   Workers & Pages → candybloomcandles → Settings → Environment variables
3. Dodaj zmienne:
   ADMIN_PASSWORD = hasło do panelu
   GITHUB_TOKEN = token GitHuba z dostępem do repozytorium
4. Opcjonalnie:
   GITHUB_OWNER = Ariergardan
   GITHUB_REPO = candybloomcandles
   GITHUB_BRANCH = main
5. Po dodaniu zmiennych zrób nowy deploy:
   Deployments → Retry deployment
   albo zrób mały commit na GitHubie.
6. Wejdź na:
   https://candybloomcandles.pl/admin
7. Zaloguj się hasłem ADMIN_PASSWORD i kliknij Zapisz testowo.

Uwaga:
Netlify Forms nie działają na Cloudflare. Formularz zamówień trzeba będzie osobno przepiąć na Cloudflare Function albo zewnętrzną usługę mailową.
