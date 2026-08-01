# Husbilsappen

Webbapp för att planera husbilsresor:

- **Recept** – lägg in recept med ingredienser (mängd + enhet) och tillagningsbeskrivning.
- **Skafferi** – registrera matvaror du har hemma respektive i husbilen.
- **Resor** – välj recept till en resa så räknar appen ut:
  - vad som redan finns i husbilen,
  - vad som behöver **flyttas hemifrån**,
  - vad som behöver **handlas**.
- **Listor** – packlistor med checkrutor, samt återanvändbara checklistor (t.ex. inför avfärd, parkering, natten) som kan bockas av och återställas inför varje resa.

Hela appen skyddas av ett gemensamt lösenord (ingen inloggning per person).

## Teknik

- **Frontend:** React + TypeScript + Vite + Tailwind, byggs till statiska filer i `dist/`.
- **Backend:** Node.js + Express, exponerar ett REST-API under `/api/*` och serverar den byggda frontenden.
- **Databas:** MySQL/MariaDB (fungerar fint med phpMyAdmin).

Appen kräver nätuppkoppling mot servern för att fungera (ingen offline-läge).

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

1. **Databas:** Skapa en databas och användare via phpMyAdmin/hotellets kontrollpanel. Importera `server/schema.sql` (t.ex. via phpMyAdmins "Importera"-flik).
2. **Miljövariabler:** Sätt följande i hotellets Node.js-app-inställningar (samma namn som i `.env.example`):
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `APP_PASSWORD` – lösenordet du vill logga in med
   - `SESSION_SECRET` – lång slumpad hemlighet
   - `PORT` – porten hotellet vill att appen lyssnar på (många paneler sätter denna automatiskt)
3. **Bygg och starta:**
   ```bash
   npm install
   npm run build
   npm start
   ```
   `npm start` kör `server/index.js`, som både svarar på `/api/*` och serverar den byggda frontenden – en enda Node-process. Om din hotellpanel har ett "Setup Node.js App"-läge, peka startfilen på `server/index.js` och kör `npm run build` som en engångs-/deploy-åtgärd innan appen startas.

Byt `APP_PASSWORD` när du vill ändra lösenordet – alla som redan är inloggade förblir det tills sessionen (30 dagar) eller cookien rensas.
