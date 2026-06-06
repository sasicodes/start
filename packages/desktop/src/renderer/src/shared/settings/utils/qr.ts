type EccLevel = 'low' | 'medium' | 'quartile' | 'high';

interface QrOptions {
  margin: number;
  ecc: EccLevel;
}

const eccOrdinal: Record<EccLevel, number> = { low: 0, medium: 1, quartile: 2, high: 3 };
const eccFormatBits: Record<EccLevel, number> = { low: 1, medium: 0, quartile: 3, high: 2 };

const eccCodewordsPerBlock = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
];

const eccBlocks = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
];

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
      result[j] = reedSolomonMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = reedSolomonMultiply(root, 2);
  }
  return result;
};

const reedSolomonRemainder = (data: Uint8Array, divisor: Uint8Array) => {
  const result = new Uint8Array(divisor.length);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < result.length; i += 1) result[i] ^= reedSolomonMultiply(divisor[i], factor);
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
    Math.floor(rawDataModules(version) / 8) - eccCodewordsPerBlock[ordinal][version] * eccBlocks[ordinal][version]
  );
};

const charCountBits = (version: number) => (version <= 9 ? 8 : 16);

const selectVersion = (length: number, ecc: EccLevel) => {
  for (let version = 1; version <= 40; version += 1) {
    const capacity = dataCodewords(version, ecc) * 8;
    if (4 + charCountBits(version) + 8 * length <= capacity) return version;
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
  for (let i = 0; i < bits.length; i += 1) codewords[i >>> 3] |= bits[i] << (7 - (i & 7));
  return codewords;
};

const interleaveBlocks = (codewords: Uint8Array, version: number, ecc: EccLevel) => {
  const ordinal = eccOrdinal[ecc];
  const blockCount = eccBlocks[ordinal][version];
  const eccLength = eccCodewordsPerBlock[ordinal][version];
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

  const result = new Uint8Array(total);
  let index = 0;
  for (let i = 0; i < blocks[0].length; i += 1) {
    for (let j = 0; j < blocks.length; j += 1) {
      if (i !== shortBlockLength - eccLength || j >= shortBlockCount) {
        result[index] = blocks[j][i];
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

interface Grid {
  size: number;
  modules: boolean[][];
  reserved: boolean[][];
}

const createGrid = (version: number): Grid => {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  return { size, modules, reserved };
};

const setFunction = (grid: Grid, x: number, y: number, dark: boolean) => {
  grid.modules[y][x] = dark;
  grid.reserved[y][x] = true;
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
    grid.reserved[8][i] = true;
    grid.reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i += 1) {
    grid.reserved[8][grid.size - 1 - i] = true;
    grid.reserved[grid.size - 1 - i][8] = true;
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
  for (const ay of positions) {
    for (const ax of positions) {
      const onFinder =
        (ax === 6 && ay === 6) ||
        (ax === 6 && ay === positions[positions.length - 1]) ||
        (ax === positions[positions.length - 1] && ay === 6);
      if (!onFinder) drawAlignment(grid, ax, ay);
    }
  }

  setFunction(grid, 8, grid.size - 8, true);
  reserveFormatAreas(grid);

  if (version >= 7) {
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        grid.reserved[row][grid.size - 11 + col] = true;
        grid.reserved[grid.size - 11 + col][row] = true;
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
        if (grid.reserved[y][x]) continue;
        const value = bit < codewords.length * 8 && ((codewords[bit >>> 3] >>> (7 - (bit & 7))) & 1) !== 0;
        grid.modules[y][x] = value;
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
      if (!grid.reserved[y][x] && maskCondition(mask, x, y)) grid.modules[y][x] = !grid.modules[y][x];
    }
  }
};

const drawFormatBits = (grid: Grid, ecc: EccLevel, mask: number) => {
  const data = (eccFormatBits[ecc] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;

  for (let i = 0; i <= 5; i += 1) grid.modules[i][8] = ((bits >>> i) & 1) !== 0;
  grid.modules[7][8] = ((bits >>> 6) & 1) !== 0;
  grid.modules[8][8] = ((bits >>> 7) & 1) !== 0;
  grid.modules[8][7] = ((bits >>> 8) & 1) !== 0;
  for (let i = 9; i < 15; i += 1) grid.modules[8][14 - i] = ((bits >>> i) & 1) !== 0;

  for (let i = 0; i < 8; i += 1) grid.modules[8][grid.size - 1 - i] = ((bits >>> i) & 1) !== 0;
  for (let i = 8; i < 15; i += 1) grid.modules[grid.size - 15 + i][8] = ((bits >>> i) & 1) !== 0;
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
    grid.modules[b][a] = value;
    grid.modules[a][b] = value;
  }
};

const penaltyScore = (grid: Grid) => {
  const { size, modules } = grid;
  let score = 0;

  for (let y = 0; y < size; y += 1) {
    let runColor = modules[y][0];
    let runLen = 1;
    for (let x = 1; x < size; x += 1) {
      if (modules[y][x] === runColor) {
        runLen += 1;
        if (runLen === 5) score += 3;
        else if (runLen > 5) score += 1;
      } else {
        runColor = modules[y][x];
        runLen = 1;
      }
    }
  }
  for (let x = 0; x < size; x += 1) {
    let runColor = modules[0][x];
    let runLen = 1;
    for (let y = 1; y < size; y += 1) {
      if (modules[y][x] === runColor) {
        runLen += 1;
        if (runLen === 5) score += 3;
        else if (runLen > 5) score += 1;
      } else {
        runColor = modules[y][x];
        runLen = 1;
      }
    }
  }

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
    }
  }

  const pattern = [true, false, true, true, true, false, true];
  const hasFinderRun = (cells: boolean[], index: number) => {
    if (pattern.some((value, k) => cells[index + k] !== value)) return false;
    const before = cells.slice(Math.max(0, index - 4), index).every((value) => !value) && index >= 4;
    const after =
      cells.slice(index + 7, index + 11).every((value) => !value) && index + 11 <= cells.length;
    return before || after;
  };
  for (let y = 0; y < size; y += 1) {
    const row = modules[y];
    const col = modules.map((r) => r[y]);
    for (let x = 0; x + 7 <= size; x += 1) {
      if (hasFinderRun(row, x)) score += 40;
      if (hasFinderRun(col, x)) score += 40;
    }
  }

  let dark = 0;
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (modules[y][x]) dark += 1;
  const total = size * size;
  const ratio = (dark * 100) / total;
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;
  return score;
};

const cloneGrid = (grid: Grid): Grid => ({
  size: grid.size,
  modules: grid.modules.map((row) => [...row]),
  reserved: grid.reserved.map((row) => [...row])
});

export const qrMatrix = (text: string, ecc: EccLevel = 'medium') => {
  const bytes = new TextEncoder().encode(text);
  const version = selectVersion(bytes.length, ecc);
  const codewords = interleaveBlocks(buildCodewords(bytes, version, ecc), version, ecc);

  const base = createGrid(version);
  drawFunctionPatterns(base, version);
  placeData(base, codewords);

  let bestGrid = base;
  let bestMask = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = cloneGrid(base);
    applyMask(candidate, mask);
    drawFormatBits(candidate, ecc, mask);
    drawVersionBits(candidate, version);
    const score = penaltyScore(candidate);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
      bestGrid = candidate;
    }
  }
  void bestMask;
  return bestGrid.modules;
};

export const qrSvg = (text: string, { margin, ecc }: QrOptions) => {
  const modules = qrMatrix(text, ecc);
  const dimension = modules.length + margin * 2;
  let cells = '';
  for (let y = 0; y < modules.length; y += 1) {
    for (let x = 0; x < modules.length; x += 1) {
      if (modules[y][x]) cells += `<rect x="${x + margin}" y="${y + margin}" width="1" height="1" rx="0.35" />`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" fill="currentColor">${cells}</svg>`;
};
