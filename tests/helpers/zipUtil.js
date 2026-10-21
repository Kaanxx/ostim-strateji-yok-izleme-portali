/**
 * Lightweight Pure Node.js OpenXML / ZIP Reader & Utilities
 * Provides zero-dependency parsing of .xlsx and .xlsm files.
 */

const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

class ZipReader {
  constructor(bufferOrPath) {
    if (typeof bufferOrPath === 'string') {
      this.buffer = fs.readFileSync(bufferOrPath);
    } else {
      this.buffer = bufferOrPath;
    }
    this.entries = {};
    this._parse();
  }

  _parse() {
    const buf = this.buffer;
    let idx = 0;
    while (idx < buf.length - 4) {
      const sig = buf.readUInt32LE(idx);
      if (sig === 0x04034b50) { // Local file header
        const flags = buf.readUInt16LE(idx + 6);
        const compMethod = buf.readUInt16LE(idx + 8);
        const modTime = buf.readUInt16LE(idx + 10);
        const modDate = buf.readUInt16LE(idx + 12);
        const crc32 = buf.readUInt32LE(idx + 14);
        let compSize = buf.readUInt32LE(idx + 18);
        let uncompSize = buf.readUInt32LE(idx + 22);
        const fnLen = buf.readUInt16LE(idx + 26);
        const extraLen = buf.readUInt16LE(idx + 28);
        const filename = buf.toString('utf8', idx + 30, idx + 30 + fnLen);
        const dataStart = idx + 30 + fnLen + extraLen;

        // If flags bit 3 is set, sizes might be in data descriptor, but standard OpenXML files don't use this.
        const compData = buf.subarray(dataStart, dataStart + compSize);
        this.entries[filename] = {
          filename,
          compMethod,
          compSize,
          uncompSize,
          crc32,
          compData,
        };
        idx = dataStart + compSize;
      } else {
        idx++;
      }
    }
  }

  hasEntry(entryPath) {
    return Boolean(this.entries[entryPath]);
  }

  getEntryNames() {
    return Object.keys(this.entries);
  }

  readEntryBuffer(entryPath) {
    const entry = this.entries[entryPath];
    if (!entry) return null;
    if (entry.compMethod === 0) { // Stored
      return entry.compData;
    } else if (entry.compMethod === 8) { // Deflated
      return zlib.inflateRawSync(entry.compData);
    } else {
      throw new Error(`Unsupported compression method ${entry.compMethod} for ${entryPath}`);
    }
  }

  readEntryText(entryPath, encoding = 'utf8') {
    const buf = this.readEntryBuffer(entryPath);
    return buf ? buf.toString(encoding) : null;
  }

  getEntrySha256(entryPath) {
    const buf = this.readEntryBuffer(entryPath);
    if (!buf) return null;
    return crypto.createHash('sha256').update(buf).digest('hex');
  }

  getSheetNames() {
    const wbXml = this.readEntryText('xl/workbook.xml');
    if (!wbXml) return [];
    const sheetRegex = /<sheet[^>]*name="([^"]+)"/g;
    const sheets = [];
    let match;
    while ((match = sheetRegex.exec(wbXml)) !== null) {
      sheets.push(match[1]);
    }
    return sheets;
  }

  getSharedStrings() {
    const sstXml = this.readEntryText('xl/sharedStrings.xml');
    if (!sstXml) return [];
    const strings = [];
    // Extract <si>...<t>...</t>...</si>
    const siRegex = /<si>([\s\S]*?)<\/si>/g;
    let match;
    while ((match = siRegex.exec(sstXml)) !== null) {
      const siContent = match[1];
      const tMatches = siContent.match(/<t[^>]*>([^<]*)<\/t>/g) || [];
      const text = tMatches.map(t => t.replace(/<t[^>]*>/, '').replace(/<\/t>/, '')).join('');
      strings.push(text);
    }
    return strings;
  }
}

/**
 * Creates a minimal valid OOXML ZIP buffer for testing export/import round-trips.
 */
function createMinimalZip(files) {
  // files is a map of { [filename]: Buffer or String }
  const localHeaders = [];
  const centralDirHeaders = [];
  let offset = 0;

  for (const [filename, content] of Object.entries(files)) {
    const dataBuf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const compData = zlib.deflateRawSync(dataBuf);
    const fnBuf = Buffer.from(filename, 'utf8');

    // Local Header
    const lh = Buffer.alloc(30 + fnBuf.length);
    lh.writeUInt32LE(0x04034b50, 0); // Local file header signature
    lh.writeUInt16LE(20, 4); // Version needed
    lh.writeUInt16LE(0, 6); // General purpose bit flag
    lh.writeUInt16LE(8, 8); // Compression method (deflate)
    lh.writeUInt16LE(0, 10); // Mod time
    lh.writeUInt16LE(0, 12); // Mod date
    lh.writeUInt32LE(crc32(dataBuf), 14); // CRC32
    lh.writeUInt32LE(compData.length, 18); // Comp size
    lh.writeUInt32LE(dataBuf.length, 22); // Uncomp size
    lh.writeUInt16LE(fnBuf.length, 26); // Filename length
    lh.writeUInt16LE(0, 28); // Extra length
    fnBuf.copy(lh, 30);

    localHeaders.push(lh);
    localHeaders.push(compData);

    // Central Directory Header
    const cdh = Buffer.alloc(46 + fnBuf.length);
    cdh.writeUInt32LE(0x02014b50, 0); // Central file header signature
    cdh.writeUInt16LE(20, 4); // Version made by
    cdh.writeUInt16LE(20, 6); // Version needed
    cdh.writeUInt16LE(0, 8); // Flags
    cdh.writeUInt16LE(8, 10); // Method
    cdh.writeUInt16LE(0, 12); // Mod time
    cdh.writeUInt16LE(0, 14); // Mod date
    cdh.writeUInt32LE(crc32(dataBuf), 16); // CRC32
    cdh.writeUInt32LE(compData.length, 20); // Comp size
    cdh.writeUInt32LE(dataBuf.length, 24); // Uncomp size
    cdh.writeUInt16LE(fnBuf.length, 28); // Filename length
    cdh.writeUInt16LE(0, 30); // Extra length
    cdh.writeUInt16LE(0, 32); // Comment length
    cdh.writeUInt16LE(0, 34); // Disk num
    cdh.writeUInt16LE(0, 36); // Internal attr
    cdh.writeUInt32LE(0, 38); // External attr
    cdh.writeUInt32LE(offset, 42); // Relative offset
    fnBuf.copy(cdh, 46);

    centralDirHeaders.push(cdh);
    offset += lh.length + compData.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cdh of centralDirHeaders) {
    cdSize += cdh.length;
  }

  // End of Central Directory Record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // Disk number
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(Object.keys(files).length, 8); // Total entries on disk
  eocd.writeUInt16LE(Object.keys(files).length, 10); // Total entries
  eocd.writeUInt32LE(cdSize, 12); // Central dir size
  eocd.writeUInt32LE(cdOffset, 16); // Central dir offset
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localHeaders, ...centralDirHeaders, eocd]);
}

// Simple CRC32 implementation
function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return (crc ^ ~0) >>> 0;
}

module.exports = {
  ZipReader,
  createMinimalZip,
  crc32,
};
