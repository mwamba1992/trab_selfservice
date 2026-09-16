import { describe, expect, it, afterEach } from 'vitest';
import { closePreview, fileIcon, formatBytes, mimeFor, openPreview, previewKind, previewState } from './files.js';

afterEach(closePreview);

describe('mimeFor', () => {
  it('retypes by extension so a PDF displays instead of downloading', () => {
    expect(mimeFor('ruling.pdf')).toBe('application/pdf');
    expect(mimeFor('photo.JPG')).toBe('image/jpeg');
  });

  it('falls back for anything unknown', () => {
    expect(mimeFor('archive.zip')).toBe('application/octet-stream');
  });
});

describe('previewKind', () => {
  it('separates what can be shown from what must be downloaded', () => {
    expect(previewKind('a.pdf')).toBe('pdf');
    expect(previewKind('a.png')).toBe('image');
    expect(previewKind('a.docx')).toBe('other');
  });
});

describe('fileIcon', () => {
  it('picks an icon per file family', () => {
    expect(fileIcon('a.pdf')).toBe('pi-file-pdf');
    expect(fileIcon('a.docx')).toBe('pi-file-word');
    expect(fileIcon('a.jpeg')).toBe('pi-image');
    expect(fileIcon(null)).toBe('pi-file');
  });
});

describe('formatBytes', () => {
  it('scales the unit to the size', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });

  it('shows a dash when the size is missing', () => {
    expect(formatBytes(null)).toBe('-');
  });
});

describe('preview window', () => {
  it('holds one request at a time', () => {
    openPreview({ fileName: 'a.pdf', title: 'Ruling' });
    expect(previewState.request.title).toBe('Ruling');
    closePreview();
    expect(previewState.request).toBeNull();
  });
});
