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
