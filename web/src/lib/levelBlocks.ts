// Era nivåklossar - en av varje. Justera här om ni skaffar fler/andra.
export const AVAILABLE_BLOCKS_CM = [4, 7, 10]

export interface BlockCombo {
  heights: number[]
  totalCm: number
}

function allCombos(blocks: number[]): BlockCombo[] {
  const combos: BlockCombo[] = [{ heights: [], totalCm: 0 }]
  for (const block of blocks) {
    for (const combo of [...combos]) {
      combos.push({ heights: [...combo.heights, block].sort((a, b) => b - a), totalCm: combo.totalCm + block })
    }
  }
  return combos
}

const ALL_COMBOS = allCombos(AVAILABLE_BLOCKS_CM)

export function bestBlockCombo(neededCm: number): BlockCombo {
  return ALL_COMBOS.reduce((best, combo) =>
    Math.abs(combo.totalCm - neededCm) < Math.abs(best.totalCm - neededCm) ? combo : best,
  )
}

// spanM = avståndet (i meter) mellan de två punkter som lutningen mäts
// över - fordonets bredd för sida-till-sida, axelavståndet för fram-bak.
export function neededHeightCm(spanM: number, tiltDeg: number): number {
  return spanM * 100 * Math.tan((Math.abs(tiltDeg) * Math.PI) / 180)
}
