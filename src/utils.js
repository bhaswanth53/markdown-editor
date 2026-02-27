/** Escape HTML special characters */
export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Generate a short random id */
export const uid = () => 'mde_' + Math.random().toString(36).slice(2, 9);

/** Detect whether a string contains HTML tags */
export const isHtml = (s) => /<[a-z][\s\S]*>/i.test(s);
