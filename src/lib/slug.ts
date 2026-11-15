export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // bỏ dấu tiếng Việt
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')       // ký tự khác chữ, số → "-"
    .replace(/^-+|-+$/g, '');          // bỏ "-" thừa ở đầu, cuối
}

// Chuỗi dùng để tìm kiếm: bỏ dấu, chữ thường, gộp khoảng trắng. "Áo  Thun Đỏ" -> "ao thun do"
export function toSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
