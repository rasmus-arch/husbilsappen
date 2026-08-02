import crypto from 'node:crypto'
import { pool } from './db.js'

function makeChecklist(kind, name, itemTexts) {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    kind,
    name,
    items: itemTexts.map((text) => ({ id: crypto.randomUUID(), text })),
    now,
  }
}

export async function seedDefaultsIfEmpty() {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    // SELECT ... FOR UPDATE serializes concurrent seed attempts (e.g. multiple
    // server instances booting at once) so defaults are never inserted twice.
    const [rows] = await connection.query('SELECT COUNT(*) AS cnt FROM checklists FOR UPDATE')
    if (rows[0].cnt > 0) {
      await connection.commit()
      return
    }

    const defaults = [
      makeChecklist('rutin', 'Innan avfärd', [
        'Gasol avstängd',
        'Vatten fyllt',
        'Gråvattentank tömd',
        'Toalettkassett tömd',
        'Kylskåp omställt (12V/gasol)',
        'Fönster och takluckor stängda',
        'Markis infälld',
        'Trappsteg infällt',
        'El och vatten kopplat från',
        'Allt fastspänt inomhus',
      ]),
      makeChecklist('rutin', 'Parkering/uppställning', [
        'Plant underlag kontrollerat',
        'Handbroms/klossar',
        'Stödben nedfällda',
        'Markis (om lämpligt)',
        'El ansluten',
        'Vatten anslutet',
      ]),
      makeChecklist('rutin', 'Natt', [
        'Dörrar låsta',
        'Gasol avstängd vid behov',
        'Fönster på glänt för ventilation',
        'Värme inställd',
        'Mobiler på laddning',
      ]),
    ]

    for (const checklist of defaults) {
      await connection.query('INSERT INTO checklists (id, kind, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
        checklist.id,
        checklist.kind,
        checklist.name,
        checklist.now,
        checklist.now,
      ])
      if (checklist.items.length > 0) {
        const values = checklist.items.map((item, index) => [item.id, checklist.id, item.text, 0, index])
        await connection.query(
          'INSERT INTO checklist_items (id, checklist_id, text, checked, sort_order) VALUES ?',
          [values],
        )
      }
    }

    await connection.commit()
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

// Lägger till en enskild standardchecklista om ingen med samma namn redan
// finns - till skillnad från seedDefaultsIfEmpty körs denna alltid, så att
// nya mallar (tillagda i en senare uppdatering av appen) dyker upp även för
// installationer som redan har checklistor sedan tidigare.
export async function ensureDefaultChecklist(kind, name, itemTexts) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query('SELECT id FROM checklists WHERE name = ? FOR UPDATE', [name])
    if (rows.length > 0) {
      await connection.commit()
      return
    }
    const checklist = makeChecklist(kind, name, itemTexts)
    await connection.query('INSERT INTO checklists (id, kind, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      checklist.id,
      checklist.kind,
      checklist.name,
      checklist.now,
      checklist.now,
    ])
    if (checklist.items.length > 0) {
      const values = checklist.items.map((item, index) => [item.id, checklist.id, item.text, 0, index])
      await connection.query(
        'INSERT INTO checklist_items (id, checklist_id, text, checked, sort_order) VALUES ?',
        [values],
      )
    }
    await connection.commit()
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

// Lägger till ett FAQ-kort om ingen med samma fråga redan finns - körs alltid
// (precis som ensureDefaultChecklist) så nya kort som läggs till i en senare
// uppdatering dyker upp även för installationer som redan har egna kort.
export async function ensureFaqCard(question, answer, source) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query('SELECT id FROM faq_cards WHERE question = ? FOR UPDATE', [question])
    if (rows.length > 0) {
      await connection.commit()
      return
    }
    const id = crypto.randomUUID()
    const now = Date.now()
    await connection.query(
      'INSERT INTO faq_cards (id, question, answer, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, question, answer, source, now, now],
    )
    await connection.commit()
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}
