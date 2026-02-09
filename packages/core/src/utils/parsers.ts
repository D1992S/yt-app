export const parseSrtToText = (content: string): string => {
  // Remove timestamps and indices
  return content
    .replace(/\r\n/g, '\n')
    .replace(/^\d+$/gm, '') // Indices
    .replace(/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/gm, '') // Timestamps
    .replace(/<[^>]*>/g, '') // HTML tags
    .replace(/\n+/g, ' ') // Collapse newlines
    .trim();
};

export const parseSrtToSegments = (content: string): { start: number; text: string }[] => {
  const segments: { start: number; text: string }[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 2) continue;

    // Find timestamp line
    const timeLineIdx = lines.findIndex(l => l.includes('-->'));
    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const text = lines.slice(timeLineIdx + 1).join(' ').replace(/<[^>]*>/g, '');
    
    const match = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      const ms = parseInt(match[4]);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds + ms / 1000;
      segments.push({ start: totalSeconds, text });
    }
  }
  return segments;
};

export const parseCsv = (content: string): string[][] => {
  const lines = content.trim().split(/\r?\n/);
  return lines.map(line => {
    // Simple CSV split, handling quotes roughly
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    return matches ? matches.map(m => m.replace(/^"|"$/g, '')) : line.split(',');
  });
};
