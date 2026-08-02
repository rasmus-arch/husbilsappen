// Era nivåklossar staplas i varandra: 1 kloss = 4 cm, 2 staplade = 7 cm,
// 3 staplade = 10 cm (inte tre fristående block som kan kombineras fritt).
// Justera här om ni skaffar ett annat klosstset.
export const BLOCK_STACK_LEVELS_CM = [0, 4, 7, 10]

export interface BlockLevel {
  count: number
  totalCm: number
}

const LEVELS: BlockLevel[] = BLOCK_STACK_LEVELS_CM.map((totalCm, count) => ({ count, totalCm }))

export function bestBlockLevel(neededCm: number): BlockLevel {
  return LEVELS.reduce((best, level) =>
    Math.abs(level.totalCm - neededCm) < Math.abs(best.totalCm - neededCm) ? level : best,
  )
}

export interface WheelLifts {
  fl: number
  fr: number
  rl: number
  rr: number
}

// Räknar ut hur mycket varje hjul (fram/bak x vänster/höger) behöver lyftas
// för att husbilen ska stå plant, med båda lutningarna samtidigt.
//
// gammaDeg: sida-till-sida-lutning. Positiv = höger sida lägre.
// betaDeg: fram-till-bak-lutning. Positiv = bakänden lägre.
// widthM/wheelbaseM: avståndet mellan hjulen i respektive led.
//
// Hörnen ligger i ett plan som lutar enligt de två vinklarna. Det hörn som
// redan står högst behöver inget lyft (0 cm) - övriga hörn får sitt behov
// räknat relativt det hörnet, eftersom man bara kan lägga på klossar, inte
// gräva ner ett hjul.
export function wheelLifts(gammaDeg: number, betaDeg: number, widthM: number, wheelbaseM: number): WheelLifts {
  const sideCm = widthM * 100 * Math.tan((gammaDeg * Math.PI) / 180)
  const frontBackCm = wheelbaseM * 100 * Math.tan((betaDeg * Math.PI) / 180)

  const lowness = {
    fl: 0,
    fr: sideCm,
    rl: frontBackCm,
    rr: sideCm + frontBackCm,
  }
  const min = Math.min(lowness.fl, lowness.fr, lowness.rl, lowness.rr)
  return {
    fl: lowness.fl - min,
    fr: lowness.fr - min,
    rl: lowness.rl - min,
    rr: lowness.rr - min,
  }
}
