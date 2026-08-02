import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireAuth } from './auth.js'
import { ensureDefaultChecklist, ensureFaqCard, seedDefaultsIfEmpty } from './seed.js'
import { uploadsDir } from './uploadsDir.js'
import authRoutes from './routes/auth.js'
import recipeRoutes from './routes/recipes.js'
import inventoryRoutes from './routes/inventory.js'
import tripRoutes from './routes/trips.js'
import checklistRoutes from './routes/checklists.js'
import logbookRoutes from './routes/logbook.js'
import publicRoutes from './routes/public.js'
import vehicleRoutes from './routes/vehicle.js'
import serviceRoutes from './routes/service.js'
import placeRoutes from './routes/places.js'
import emergencyContactRoutes from './routes/emergencyContacts.js'
import fuelRoutes from './routes/fuel.js'
import statsRoutes from './routes/stats.js'
import manualRoutes from './routes/manuals.js'
import geocodeRoutes from './routes/geocode.js'
import faqRoutes from './routes/faq.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(express.json())
  app.use(cookieParser())

  app.use('/api/auth', authRoutes)
  app.use('/api/recipes', requireAuth, recipeRoutes)
  app.use('/api/inventory', requireAuth, inventoryRoutes)
  app.use('/api/trips', requireAuth, tripRoutes)
  app.use('/api/checklists', requireAuth, checklistRoutes)
  app.use('/api/logbook', requireAuth, logbookRoutes)
  app.use('/api/vehicle', requireAuth, vehicleRoutes)
  app.use('/api/service', requireAuth, serviceRoutes)
  app.use('/api/places', requireAuth, placeRoutes)
  app.use('/api/emergency-contacts', requireAuth, emergencyContactRoutes)
  app.use('/api/fuel', requireAuth, fuelRoutes)
  app.use('/api/stats', requireAuth, statsRoutes)
  app.use('/api/manuals', requireAuth, manualRoutes)
  app.use('/api/geocode', requireAuth, geocodeRoutes)
  app.use('/api/faq', requireAuth, faqRoutes)
  app.use('/api/public', publicRoutes)

  // Publikt tillgängligt så att både den inloggade appen och den delade
  // loggboks-länken kan visa bilder utan inloggning. Filnamnen är slumpade
  // UUID:n, så de går inte att gissa sig till.
  app.use('/uploads', express.static(uploadsDir))

  app.use(express.static(distDir))
  app.get(/^(?!\/api\/|\/uploads\/).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })

  app.use((err, req, res, _next) => {
    if (err instanceof multer.MulterError || /bildfiler/.test(err.message ?? '')) {
      return res.status(400).json({ error: err.message })
    }
    console.error(err)
    res.status(500).json({ error: 'Internt serverfel' })
  })

  return app
}

export async function start() {
  await seedDefaultsIfEmpty()
  await ensureDefaultChecklist('rutin', 'Husdjur inför resa', [
    'Vaccinationsintyg/pass med',
    'Koppel & sele',
    'Foder & vattenskål',
    'Filt/bädd',
    'Leksaker',
    'Eventuella mediciner',
    'Bilbälte/bur säkrat under färd',
    'ID-bricka på halsband',
  ])

  const EBL31 = 'Elcentral Schaudt EBL 31'
  const SUNLIGHT = 'Sunlight husbilsmanual'
  await ensureFaqCard(
    'Vilken position ska batterivalsswitchen stå i?',
    'Ställ omkopplaren på "Gel" för bly-gelbatteri eller "AGM" för AGM-batteri. Koppla först bort elcentralen från 230V innan du flyttar omkopplaren, med t.ex. en kulspetspenna. Fel inställning kan ge explosionsrisk pga gasbildning.',
    EBL31,
  )
  await ensureFaqCard(
    'Husvagnsbatteriet laddas inte vid 230V-anslutning, vad kan det bero på?',
    'Kontrollera: automatsäkringen i bilen (ingen nätspänning), om för många förbrukare är påslagna, eller om elcentralen är defekt (kontakta service).',
    EBL31,
  )
  await ensureFaqCard(
    'Kylskåpet får ingen ström under körning, vad ska jag kolla?',
    'Kontrollera säkringen (20A matning, ev. 2A för D+-signalen) och kablaget till kylskåpet. Kvarstår felet kan elcentralen eller kylskåpet vara defekt.',
    EBL31,
  )
  await ensureFaqCard(
    'Vad händer om jag stänger av batteribrytaren inför vinterförvaring?',
    'Alla 12V-förbrukare, frostskyddsventilen och manöverpanelen kopplas bort. OBS: frostskyddsventilen öppnas då automatiskt, vilket kan orsaka vattenläckage - ladda batteriet fullt innan och se till att vattensystemet är tömt.',
    EBL31,
  )
  await ensureFaqCard(
    'Får jag byta eller laga en säkring själv?',
    'Byt bara säkringar när elcentralen är helt strömlös och bara efter att felorsaken är åtgärdad. Bygla eller reparera aldrig en säkring - använd bara originalsäkringar med rätt amperetal.',
    EBL31,
  )
  await ensureFaqCard(
    'Vilken typ av batteri passar elcentralen EBL 31?',
    '6-cells bly-gel- eller AGM-batteri, minst 55 Ah.',
    EBL31,
  )
  await ensureFaqCard(
    'Hur mycket får sängarna belastas?',
    'Liggytorna har olika maxvikt (t.ex. 280 kg respektive 300 kg beroende på säng) - kontrollera skylten/manualen för just er säng innan flera personer ligger eller sitter samtidigt.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Var hittar jag info om nivåklossar och uppställning?',
    'Avsnitt 6.3 i manualen ("Uppställning av husbilen") beskriver hur nivåklossar används vid uppställning.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad ska jag tänka på vid gränsöverskridande resor?',
    'Avsnitt 17.7 ("Användbara tips") tar upp gränsövergångstips, gasadapter per land samt råd för säker övernattning och vintercamping - värt att läsa igenom innan en utlandsresa.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Finns det en packlista i manualen?',
    'Ja, avsnitt 17.7 innehåller en packlista uppdelad i kök, bad och dokument.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad gör jag om det brinner?',
    'Stäng gasflaskans huvudkran, bryt elförsörjningen om möjligt, varna medresenärer och lämna fordonet. Använd brandsläckaren bara om branden är liten och det går att göra säkert.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad gäller för bakre bagageutrymmet?',
    'Kontrollera skylten i utrymmet för max tillåten last innan du lastar - överskrid den inte.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad ska jag tänka på med cykelhållaren?',
    'Kontrollera cykelhållarens max tillåtna last och att den är korrekt monterad, och lås fast cyklarna. Kontrollera regelbundet under färd att allt sitter fast.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Måste alla ha bälte på i husbilen under färd?',
    'Ja, alla som färdas ska använda bilbälte, och barn ska sitta i en godkänd bilbarnstol/isofix om sådan finns monterad.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad gäller för hopfällbara stolar?',
    'Montera enligt manualens bilder och kontrollera att säkerhetslåsningen är aktiverad innan färd - en dåligt låst stol kan vara farlig vid inbromsning.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad ska jag tänka på med stödbenen vid uppställning?',
    'Fäll ner stödbenen vid uppställning för stabilitet, men de är inte avsedda att bära hela fordonets vikt eller ersätta handbroms/klossar under körning.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad gör jag med kylskåpet vid uppställning?',
    'Koppla om kylskåpet från 12V (körläge) till gasol eller 230V beroende på vad som är tillgängligt på uppställningsplatsen.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Är det farligt om det bildas kondens på fönstren?',
    'Kondens vid temperaturskillnad mellan ute och inne är normalt och ingen felindikation. Vädra regelbundet för att minska fukten inomhus.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad ska jag tänka på med takluckorna?',
    'Stäng takluckorna vid regn, biltvätt och körning i låga garage/carportar. Ventilationsöppningarna kan i regel lämnas öppna även vid lätt regn.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Hur mycket får alkovsängen belastas?',
    'Alkovsängen får belastas med högst 280 kg.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Hur mycket får väggningssängen (ombyggd sittgrupp) belastas?',
    'Väggningssängen, dvs den ombyggda sittgruppen, får belastas med högst 300 kg.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad ska jag göra innan jag byter gasolflaska?',
    'Stäng huvudkranen på gasolflaskan innan du byter, kontrollera packningen på den nya flaskan och använd aldrig öppen låga för att söka gasläckor - använd läckspray eller liknande istället.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Påverkar kylan gasoltillförseln?',
    'Vid låga temperaturer minskar gasolflaskans avdunstningsförmåga, vilket kan ge sämre gastillförsel. Håll gasolflaskan så varm som möjligt vid vintercamping.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Hur ofta ska gasfiltret bytas?',
    'Gasfiltret ska bytas periodiskt enligt manualens underhållsschema (avsnitt 8.4) - kontakta en auktoriserad verkstad vid byte.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Var sitter husbilens elpanel och vad visar den?',
    'Panelen (LT 100) visar bland annat batteriets laddningsstatus och används för att styra elsystemet i husbilen.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad är viktigt att tänka på med värmesystemet (Truma Combi)?',
    'Blockera aldrig värmesystemets in- eller utluftsöppningar - risk för koloxidförgiftning. Kontrollera att ventilationsöppningarna är fria innan användning.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Var stänger jag av vattnet vid risk för frost?',
    'Använd säkerhets-/avtappningsventilen (avsnitt 10.2.6) för att tömma vattensystemet vid risk för frost.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad gäller för gasspisen/grillen?',
    'Blockera aldrig ventilationsöppningarna vid spisen/grillen och lämna aldrig öppen låga obevakad - brandrisk.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Hur håller jag kylskåpet effektivt?',
    'Håll kylskåpets utvändiga ventilationsgaller rena och fria från smuts, löv och snö för god kylning. Kylskåpet kan drivas på gasol, 230V eller 12V.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Hur rengör jag vattentanken?',
    'Rengör och desinficera dricksvattentanken regelbundet enligt manualens skötselavsnitt (12.3), särskilt inför säsongsstart.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Kan jag minska mängden vatten jag kör med?',
    'Ja, fyll bara på den mängd dricksvatten ni faktiskt behöver för resan - mindre vattenvikt sparar bränsle och nyttolast.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Hur tömmer jag toalettens latrintank?',
    'Töm latrintanken regelbundet på en avsedd tömningsstation, och använd doserad toalettvätska enligt manualens anvisningar.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Får jag tvätta husbilen med högtryckstvätt?',
    'Var försiktig - för nära spolning eller för högt tryck kan skada tätningar, dekaler och lucköppningar. Håll ordentligt avstånd och undvik onödigt högt tryck/hög temperatur.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Hur rengör jag fönster av akrylglas?',
    'Akrylglas repas lätt - rengör försiktigt med mjuk trasa och undvik vanliga fönsterputsmedel eller repande material.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Behöver husbilen genomgå några återkommande besiktningar eller prov?',
    'Ja, bland annat officiella prover/kontroller (avsnitt 13.1) och kontroll av gasanläggningen (t.ex. DVGW-prov) krävs regelbundet - kontakta en auktoriserad verkstad.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad ska jag kontrollera på däcken regelbundet?',
    'Kontrollera däcktrycket regelbundet på kalla däck, och byt däck som är skadade, för gamla eller inte godkända för fordonets max hastighet/belastning. Rätt lufttryck framgår av dekalen i fordonet.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad gör jag om jag får en varningssignal eller ett fel i husbilen?',
    'Manualens kapitel 15 (Störningsorsaker) har felsökningstabeller för el, gas, spis, värmesystem, kylskåp och vattenförsörjning - kolla där innan du kontaktar service.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Fungerar nödnumret 112 utomlands?',
    'Ja, 112 fungerar som nödnummer i hela Europa.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Vad ska jag tänka på med gasol utomlands?',
    'Regler och adaptrar för gastankning varierar mellan länder - se manualens avsnitt 17.3 (Gasförsörjningen i de europeiska länderna) innan en utlandsresa.',
    SUNLIGHT,
  )
  await ensureFaqCard(
    'Var hittar jag fordonets mått och max antal personer?',
    'Manualens avsnitt 16.1 har en tabell per modell, men kolla alltid Husbilsdata i appen för era faktiska mått enligt registreringsbeviset - säkrare än att läsa av fel modellrad i manualen.',
    SUNLIGHT,
  )

  const app = createApp()
  const port = Number(process.env.PORT || 3000)
  app.listen(port, () => {
    console.log(`Husbilsappen kör på port ${port}`)
  })
}
