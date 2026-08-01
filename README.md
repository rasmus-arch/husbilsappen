# Husbilsappen

Webbapp för att planera husbilsresor:

- **Recept** – lägg in recept med ingredienser (mängd + enhet) och tillagningsbeskrivning.
- **Skafferi** – registrera matvaror du har hemma respektive i husbilen.
- **Resor** – välj recept till en resa så räknar appen ut:
  - vad som redan finns i husbilen,
  - vad som behöver **flyttas hemifrån**,
  - vad som behöver **handlas**.
  Du kan även lägga till **egna varor** i en resas inköpsplan som inte hör till något recept (t.ex. toalettpapper) – de räknas in i samma flytta/handla-logik mot skafferiet.
- **Listor** – packlistor med checkrutor, samt återanvändbara checklistor (t.ex. inför avfärd, parkering, natten) som kan bockas av och återställas inför varje resa.
- **Loggbok** – skriv ett inlägg per dag med miltal, en bild och lite text om dagen.

Hela appen skyddas av ett gemensamt lösenord (ingen inloggning per person). Loggboken kan även delas **publikt, skrivskyddat** via en hemlig länk (`/#/dela/<kod>`) – bra för att låta familjen följa resan utan att de behöver logga in. Se `LOGBOOK_SHARE_TOKEN` nedan.

## Teknik

- **Frontend:** React + TypeScript + Vite + Tailwind. Källkoden ligger i `web/` (Vite-projektets rot) och byggs till statiska filer i `dist/` vid repo-roten.
- **Backend:** Node.js + Express, exponerar ett REST-API under `/api/*` och serverar den byggda frontenden.
- **Databas:** MySQL/MariaDB (fungerar fint med phpMyAdmin).

Appen kräver nätuppkoppling mot servern för att fungera (ingen offline-läge).

**Varför ligger frontend-koden i `web/` och inte i repo-roten?** Källkodens `index.html` (för `npm run dev`) och den byggda `dist/index.html` får aldrig ligga i samma mapp som är webbserverns dokumentrot – då kan Apache/Passenger råka servera käll-`index.html` direkt som en statisk fil istället för att routa requesten till Node-appen (syns som ett MIME-typ-fel för `/src/main.tsx` i webbläsaren). Genom att lägga källkoden i `web/` finns det bara en `index.html` i den mapp som faktiskt deployas till servern: den byggda i `dist/`.

## Lokal utveckling

1. Skapa en MySQL/MariaDB-databas och importera schemat:
   ```bash
   mysql -u <användare> -p <databas> < server/schema.sql
   ```
2. Kopiera `.env.example` till `.env` och fyll i databasuppgifter, `APP_PASSWORD` (lösenordet till appen) och `SESSION_SECRET` (en lång slumpad sträng, t.ex. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
3. Installera beroenden och starta:
   ```bash
   npm install
   npm run dev
   ```
   Detta startar frontend (Vite, `http://localhost:5173`) och API-servern (port 3001) samtidigt, med proxy mellan dem.

## Driftsättning på eget webbhotell (Node.js + MySQL/phpMyAdmin)

**Viktigt:** `dist/` (den byggda frontenden) är committad i repot med avsikt. Många delade webbhotell har för lite minne för att klara av `npm run build` (Vite/TypeScript kan kräva mer RAM än kontot tillåter, vilket ger `JavaScript heap out of memory`). Bygg därför alltid lokalt (eller be Claude bygga) och committa `dist/` – kör aldrig `npm run build` på själva webbhotellet.

1. **Databas:** Skapa en databas och användare via phpMyAdmin/hotellets kontrollpanel. Importera `server/schema.sql` (t.ex. via phpMyAdmins "Importera"-flik).
2. **Miljövariabler:** Sätt följande i hotellets Node.js-app-inställningar (samma namn som i `.env.example`):
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `APP_PASSWORD` – lösenordet du vill logga in med
   - `SESSION_SECRET` – lång slumpad hemlighet
   - `LOGBOOK_SHARE_TOKEN` (valfri) – hemlig kod för den publika loggboks-länken. Lämna tom om du inte vill kunna dela loggboken publikt.
   - `PORT` – porten hotellet vill att appen lyssnar på (många paneler sätter denna automatiskt)
3. **Hämta koden (inkl. den färdigbyggda `dist/`) och installera enbart produktionsberoenden:**
   ```bash
   git pull
   npm install --omit=dev
   npm start
   ```
   `npm start` kör `server/index.js`, som både svarar på `/api/*` och serverar den redan byggda frontenden i `dist/` – en enda Node-process. `--omit=dev` hoppar över tunga byggverktyg (Vite, TypeScript, Tailwind) som du inte behöver på servern.
4. **När koden ändras:** bygg om lokalt (`npm run build`), committa den uppdaterade `dist/`-mappen, och gör `git pull` + starta om appen på servern.

Byt `APP_PASSWORD` när du vill ändra lösenordet – alla som redan är inloggade förblir det tills sessionen (30 dagar) eller cookien rensas.

## Nya databastabeller (uppdatering)

Om du redan har en databas från tidigare och uppdaterar appen med den här versionen: importera `server/schema.sql` igen (t.ex. via phpMyAdmins "Importera"-flik). Alla `CREATE TABLE`-satser använder `IF NOT EXISTS`, så det är säkert att köra om – befintliga tabeller och data påverkas inte, bara de nya tabellerna (`trip_extra_items`, `log_entries`) skapas.

## Uppladdade bilder (loggboken)

Bilder till loggboksinlägg sparas som filer i `server/uploads/` på servern – **inte** i git och **inte** i databasen. Den mappen skapas automatiskt av appen och rörs aldrig av `git pull`/`git reset --hard` (den är listad i `.gitignore`). Tänk på att den tar disklagringsutrymme på ditt webbhotell – kontrollera din diskkvot om du laddar upp många/stora bilder.

## Dela loggboken publikt

Sätt `LOGBOOK_SHARE_TOKEN` till en lång slumpad kod (se `.env.example` för hur du genererar en), starta om appen, och dela sedan länken:

```
https://din-domän/#/dela/<LOGBOOK_SHARE_TOKEN>
```

Vem som helst med länken kan se loggboken (bilder, miltal, text) utan att logga in – men de kan inte redigera något. Byt `LOGBOOK_SHARE_TOKEN` och starta om appen för att omedelbart återkalla länken.
