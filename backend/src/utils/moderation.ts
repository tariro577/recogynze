const appearanceKeywords = [
  'hair',
  'clothes',
  'shoes',
  'looks',
  'attractive',
  'pretty',
  'handsome',
  'outfit',
  'dress',
  'style'
];

const appearanceRegex = new RegExp(`\\b(${appearanceKeywords.join('|')})\\b`, 'i');

export const containsAppearanceComment = (message: string): boolean => {
  if (!message) {
    return false;
  }
  return appearanceRegex.test(message);
};
