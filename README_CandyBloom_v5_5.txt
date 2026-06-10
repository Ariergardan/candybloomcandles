CandyBloom v5.5 — panel admina z automatycznym zapisem

Dodano:
- /admin jako własny panel edycji,
- edycję produktów, cen, opisów, kategorii i widoczności,
- upload zdjęć do assets/images,
- ustawianie pozycji zdjęcia i zoomu z realnym podglądem karty produktu,
- edycję zapachów i kategorii,
- Netlify Function zapisującą produkty i ustawienia do GitHuba.

W Netlify muszą być zmienne:
1. GITHUB_TOKEN — token GitHuba
2. ADMIN_PASSWORD — Twoje hasło do panelu admina

Opcjonalnie:
GITHUB_OWNER=Ariergardan
GITHUB_REPO=candybloomcandles
GITHUB_BRANCH=main

Po wgraniu:
1. W Netlify dodaj ADMIN_PASSWORD w Environment variables.
2. Zrób Trigger deploy.
3. Wejdź na /admin.
4. Wpisz hasło i testowo zmień np. opis produktu.
5. Kliknij Zapisz.
6. Sprawdź GitHub — powinien pojawić się commit.
