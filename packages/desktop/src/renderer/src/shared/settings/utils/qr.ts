type EccLevel = 'low' | 'medium' | 'quartile' | 'high';

interface QrOptions {
  margin: number;
  ecc: EccLevel;
}

interface Grid {
  size: number;
  modules: Uint8Array;
  reserved: Uint8Array;
}

const eccOrdinal: Record<EccLevel, number> = { low: 0, medium: 1, quartile: 2, high: 3 };
const eccFormatBits: Record<EccLevel, number> = { low: 1, medium: 0, quartile: 3, high: 2 };

const eccCodewordsPerBlock = [
  [
    -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30
  ],
  [
    -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28,
    28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28
  ],
  [
    -1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30
  ],
  [
    -1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30
  ]
];

const eccBlocks = [
  [
    -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19,
    19, 20, 21, 22, 24, 25
  ],
  [
    -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31,
    33, 35, 37, 38, 40, 43, 45, 47, 49
  ],
  [
    -1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43,
    45, 48, 51, 53, 56, 59, 62, 65, 68
  ],
  [
    -1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48,
    51, 54, 57, 60, 63, 66, 70, 74, 77, 81
  ]
];

const lookup = (table: number[][], ordinal: number, version: number) => table[ordinal]?.[version] ?? 0;

const reedSolomonMultiply = (x: number, y: number) => {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
};

const reedSolomonDivisor = (degree: number) => {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = reedSolomonMultiply(result[j] ?? 0, root);
      if (j + 1 < degree) result[j] = (result[j] ?? 0) ^ (result[j + 1] ?? 0);
    }
    root = reedSolomonMultiply(root, 2);
  }
  return result;
};

const reedSolomonRemainder = (data: Uint8Array, divisor: Uint8Array) => {
  const result = new Uint8Array(divisor.length);
  for (const byte of data) {
    const factor = byte ^ (result[0] ?? 0);
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < result.length; i += 1)
      result[i] = (result[i] ?? 0) ^ reedSolomonMultiply(divisor[i] ?? 0, factor);
  }
  return result;
};

const rawDataModules = (version: number) => {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
};

const dataCodewords = (version: number, ecc: EccLevel) => {
  const ordinal = eccOrdinal[ecc];
  return (
    Math.floor(rawDataModules(version) / 8) -
    lookup(eccCodewordsPerBlock, ordinal, version) * lookup(eccBlocks, ordinal, version)
  );
};

const charCountBits = (version: number) => (version <= 9 ? 8 : 16);

const selectVersion = (length: number, ecc: EccLevel) => {
  for (let version = 1; version <= 40; version += 1) {
    if (4 + charCountBits(version) + 8 * length <= dataCodewords(version, ecc) * 8) return version;
  }
  throw new Error('qr payload too large');
};

const appendBits = (bits: number[], value: number, count: number) => {
  for (let i = count - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
};

const buildCodewords = (bytes: Uint8Array, version: number, ecc: EccLevel) => {
  const bits: number[] = [];
  appendBits(bits, 4, 4);
  appendBits(bits, bytes.length, charCountBits(version));
  for (const byte of bytes) appendBits(bits, byte, 8);

  const capacity = dataCodewords(version, ecc) * 8;
  appendBits(bits, 0, Math.min(4, capacity - bits.length));
  appendBits(bits, 0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) appendBits(bits, pad, 8);

  const codewords = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bits.length; i += 1) {
    const index = i >>> 3;
    codewords[index] = (codewords[index] ?? 0) | ((bits[i] ?? 0) << (7 - (i & 7)));
  }
  return codewords;
};

const interleaveBlocks = (codewords: Uint8Array, version: number, ecc: EccLevel) => {
  const ordinal = eccOrdinal[ecc];
  const blockCount = lookup(eccBlocks, ordinal, version);
  const eccLength = lookup(eccCodewordsPerBlock, ordinal, version);
  const total = Math.floor(rawDataModules(version) / 8);
  const shortBlockLength = Math.floor(total / blockCount);
  const shortBlockCount = blockCount - (total % blockCount);
  const divisor = reedSolomonDivisor(eccLength);

  const blocks: Uint8Array[] = [];
  let offset = 0;
  for (let i = 0; i < blockCount; i += 1) {
    const dataLength = shortBlockLength - eccLength + (i < shortBlockCount ? 0 : 1);
    const data = codewords.slice(offset, offset + dataLength);
    offset += dataLength;
    const block = new Uint8Array(shortBlockLength + 1);
    block.set(data);
    block.set(reedSolomonRemainder(data, divisor), block.length - eccLength);
    blocks.push(block);
  }

  const blockLength = blocks[0]?.length ?? 0;
  const result = new Uint8Array(total);
  let index = 0;
  for (let i = 0; i < blockLength; i += 1) {
    for (let j = 0; j < blocks.length; j += 1) {
      if (i !== shortBlockLength - eccLength || j >= shortBlockCount) {
        result[index] = blocks[j]?.[i] ?? 0;
        index += 1;
      }
    }
  }
  return result;
};

const alignmentPositions = (version: number) => {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const positions = [6];
  for (let pos = version * 4 + 10; positions.length < count; pos -= step) positions.splice(1, 0, pos);
  return positions;
};

const createGrid = (version: number): Grid => {
  const size = version * 4 + 17;
  return { size, modules: new Uint8Array(size * size), reserved: new Uint8Array(size * size) };
};

const cellIndex = (grid: Grid, x: number, y: number) => y * grid.size + x;
const isDark = (grid: Grid, x: number, y: number) => grid.modules[cellIndex(grid, x, y)] === 1;
const isReserved = (grid: Grid, x: number, y: number) => grid.reserved[cellIndex(grid, x, y)] === 1;
const setModule = (grid: Grid, x: number, y: number, dark: boolean) => {
  grid.modules[cellIndex(grid, x, y)] = dark ? 1 : 0;
};
const reserve = (grid: Grid, x: number, y: number) => {
  grid.reserved[cellIndex(grid, x, y)] = 1;
};
const setFunction = (grid: Grid, x: number, y: number, dark: boolean) => {
  setModule(grid, x, y, dark);
  reserve(grid, x, y);
};

const drawFinder = (grid: Grid, centerX: number, centerY: number) => {
  for (let dy = -4; dy <= 4; dy += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      const x = centerX + dx;
      const y = centerY + dy;
      if (x >= 0 && x < grid.size && y >= 0 && y < grid.size) setFunction(grid, x, y, dist !== 2 && dist !== 4);
    }
  }
};

const drawAlignment = (grid: Grid, centerX: number, centerY: number) => {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      setFunction(grid, centerX + dx, centerY + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
};

const reserveFormatAreas = (grid: Grid) => {
  for (let i = 0; i < 9; i += 1) {
    reserve(grid, i, 8);
    reserve(grid, 8, i);
  }
  for (let i = 0; i < 8; i += 1) {
    reserve(grid, grid.size - 1 - i, 8);
    reserve(grid, 8, grid.size - 1 - i);
  }
};

const drawFunctionPatterns = (grid: Grid, version: number) => {
  for (let i = 0; i < grid.size; i += 1) {
    const dark = i % 2 === 0;
    setFunction(grid, 6, i, dark);
    setFunction(grid, i, 6, dark);
  }
  drawFinder(grid, 3, 3);
  drawFinder(grid, grid.size - 4, 3);
  drawFinder(grid, 3, grid.size - 4);

  const positions = alignmentPositions(version);
  const min = positions[0] ?? 0;
  const max = positions[positions.length - 1] ?? 0;
  for (const ay of positions) {
    for (const ax of positions) {
      const onFinder = (ax === min && ay === min) || (ax === min && ay === max) || (ax === max && ay === min);
      if (!onFinder) drawAlignment(grid, ax, ay);
    }
  }

  setFunction(grid, 8, grid.size - 8, true);
  reserveFormatAreas(grid);

  if (version >= 7) {
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        reserve(grid, grid.size - 11 + col, row);
        reserve(grid, row, grid.size - 11 + col);
      }
    }
  }
};

const placeData = (grid: Grid, codewords: Uint8Array) => {
  let bit = 0;
  for (let right = grid.size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < grid.size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? grid.size - 1 - vert : vert;
        if (isReserved(grid, x, y)) continue;
        const dark = bit < codewords.length * 8 && (((codewords[bit >>> 3] ?? 0) >>> (7 - (bit & 7))) & 1) !== 0;
        setModule(grid, x, y, dark);
        bit += 1;
      }
    }
  }
};

const maskCondition = (mask: number, x: number, y: number) => {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
};

const applyMask = (grid: Grid, mask: number) => {
  for (let y = 0; y < grid.size; y += 1) {
    for (let x = 0; x < grid.size; x += 1) {
      if (!isReserved(grid, x, y) && maskCondition(mask, x, y)) setModule(grid, x, y, !isDark(grid, x, y));
    }
  }
};

const drawFormatBits = (grid: Grid, ecc: EccLevel, mask: number) => {
  const data = (eccFormatBits[ecc] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const bit = (i: number) => ((bits >>> i) & 1) !== 0;

  for (let i = 0; i <= 5; i += 1) setModule(grid, 8, i, bit(i));
  setModule(grid, 8, 7, bit(6));
  setModule(grid, 8, 8, bit(7));
  setModule(grid, 7, 8, bit(8));
  for (let i = 9; i < 15; i += 1) setModule(grid, 14 - i, 8, bit(i));

  for (let i = 0; i < 8; i += 1) setModule(grid, grid.size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i += 1) setModule(grid, 8, grid.size - 15 + i, bit(i));
};

const drawVersionBits = (grid: Grid, version: number) => {
  if (version < 7) return;
  let rem = version;
  for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const bits = (version << 12) | rem;
  for (let i = 0; i < 18; i += 1) {
    const value = ((bits >>> i) & 1) !== 0;
    const a = grid.size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setModule(grid, a, b, value);
    setModule(grid, b, a, value);
  }
};

const finderPattern = [true, false, true, true, true, false, true];

const penaltyScore = (grid: Grid) => {
  const { size } = grid;
  let score = 0;

  const runScore = (read: (i: number) => boolean) => {
    let runColor = read(0);
    let runLen = 1;
    for (let i = 1; i < size; i += 1) {
      const cell = read(i);
      if (cell === runColor) {
        runLen += 1;
        if (runLen === 5) score += 3;
        else if (runLen > 5) score += 1;
      } else {
        runColor = cell;
        runLen = 1;
      }
    }
  };

  const finderLike = (read: (i: number) => boolean, index: number) => {
    for (let k = 0; k < 7; k += 1) if (read(index + k) !== (finderPattern[k] === true)) return false;
    let before = index >= 4;
    for (let k = index - 4; k < index; k += 1) if (read(k)) before = false;
    let after = index + 11 <= size;
    for (let k = index + 7; k < index + 11; k += 1) if (read(k)) after = false;
    return before || after;
  };

  for (let y = 0; y < size; y += 1) {
    const read = (i: number) => i >= 0 && i < size && isDark(grid, i, y);
    runScore(read);
    for (let x = 0; x + 7 <= size; x += 1) if (finderLike(read, x)) score += 40;
  }
  for (let x = 0; x < size; x += 1) {
    const read = (i: number) => i >= 0 && i < size && isDark(grid, x, i);
    runScore(read);
    for (let y = 0; y + 7 <= size; y += 1) if (finderLike(read, y)) score += 40;
  }

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const cell = isDark(grid, x, y);
      if (cell === isDark(grid, x + 1, y) && cell === isDark(grid, x, y + 1) && cell === isDark(grid, x + 1, y + 1))
        score += 3;
    }
  }

  let dark = 0;
  for (let i = 0; i < grid.modules.length; i += 1) if (grid.modules[i] === 1) dark += 1;
  const ratio = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;
  return score;
};

const cloneGrid = (grid: Grid): Grid => ({
  size: grid.size,
  modules: grid.modules.slice(),
  reserved: grid.reserved.slice()
});

const toMatrix = (grid: Grid): boolean[][] => {
  const rows: boolean[][] = [];
  for (let y = 0; y < grid.size; y += 1) {
    const row: boolean[] = [];
    for (let x = 0; x < grid.size; x += 1) row.push(isDark(grid, x, y));
    rows.push(row);
  }
  return rows;
};

export const qrMatrix = (text: string, ecc: EccLevel = 'medium') => {
  const bytes = new TextEncoder().encode(text);
  const version = selectVersion(bytes.length, ecc);
  const codewords = interleaveBlocks(buildCodewords(bytes, version, ecc), version, ecc);

  const base = createGrid(version);
  drawFunctionPatterns(base, version);
  placeData(base, codewords);

  let bestGrid = base;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = cloneGrid(base);
    applyMask(candidate, mask);
    drawFormatBits(candidate, ecc, mask);
    drawVersionBits(candidate, version);
    const score = penaltyScore(candidate);
    if (score < bestScore) {
      bestScore = score;
      bestGrid = candidate;
    }
  }
  return toMatrix(bestGrid);
};

const inFinder = (size: number, x: number, y: number) => {
  const within = (originX: number, originY: number) =>
    x >= originX && x < originX + 7 && y >= originY && y < originY + 7;
  return within(0, 0) || within(size - 7, 0) || within(0, size - 7);
};

type FinderOrigin = [number, number];

const qrBranch = (dimension: number, x: number, y: number) => {
  const center = dimension / 2;
  const dx = Math.abs(x - center);
  const dy = Math.abs(y - center);
  return Math.round(Math.max(dx, dy) * 0.9 + Math.abs(dx - dy) * 0.35);
};

const finderSvgs = (size: number, margin: number) => {
  const dimension = size + margin * 2;
  const origins: FinderOrigin[] = [
    [margin, margin],
    [size - 7 + margin, margin],
    [margin, size - 7 + margin]
  ];
  return origins
    .map(([x, y]) =>
      [
        `<rect x="${x}" y="${y}" width="7" height="7" rx="1.85" style="--qr-branch:${qrBranch(dimension, x + 3.5, y + 3.5)}" />`,
        `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="1.35" fill="white" />`,
        `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="1" style="--qr-branch:${qrBranch(dimension, x + 3.5, y + 3.5)}" />`
      ].join('')
    )
    .join('');
};

export const qrSvg = (text: string, { margin, ecc }: QrOptions) => {
  const modules = qrMatrix(text, ecc);
  const size = modules.length;
  const dimension = size + margin * 2;
  let cells = '';
  for (let y = 0; y < size; y += 1) {
    const row = modules[y];
    if (!row) continue;
    for (let x = 0; x < size; x += 1) {
      if (!row[x]) continue;
      if (inFinder(size, x, y)) continue;
      cells += `<rect x="${x + margin + 0.09}" y="${y + margin + 0.09}" width="0.82" height="0.82" rx="0.3" style="--qr-branch:${qrBranch(dimension, x + margin + 0.5, y + margin + 0.5)}" />`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" fill="currentColor">${finderSvgs(size, margin)}${cells}</svg>`;
};
