import fs from 'fs';

export function readLangIgnore(): string[] {
  try {
    const file = fs.readFileSync('./.langignore', 'utf-8');

    return file.split('\n');
  } catch (error) {
    console.log('Error reading ".langignore" file');
    return [];
  }
}
