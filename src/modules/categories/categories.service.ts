import { Category } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { CreateCategoryInput, UpdateCategoryInput } from "./categories.schema";

const MAX_LEVEL = 3;
type CategoryNode = Category & {children: CategoryNode[]};

export async function getTree(){
  const all = await prisma.category.findMany({orderBy: {category_name: "asc" },
  })
  
  const map = new Map<number, CategoryNode>();
  all.forEach((c) => map.set(c.id_category, {...c, children: []}));
  const roots: CategoryNode[] = []; // Danh sách các danh mục gốc 
  for (const node of map.values()){
    if(node.id_categories_parent) map.get(node.id_categories_parent)?.children.push(node); // Nếu có danh mục cha, thêm vào danh sách con của danh mục cha
    else roots.push(node);
  }
  return roots;
}

// PostgreSQL coi các giá trị NULL là khác nhau, nên @@unique không chặn được 2 loại cấp 1 trùng tên
//danh mục cần bỏ qua khi kiểm tra nếu đang update 
async function UniqueName(parentId: number | null, name: string, excludeId?: number) {
  const dup = await prisma.category.findFirst({
    where: { id_categories_parent: parentId, category_name: name, NOT: { id_category: excludeId } },
  });
  if (dup) throw new AppError(409, 'CATEGORY_EXISTS', 'Tên loại mặt hàng đã tồn tại ở cấp này');
}

async function findOrThrow(id: number) {
  const category = await prisma.category.findUnique({ where: { id_category: id } });
  if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Không tìm thấy loại mặt hàng');
  return category;
}

export async function create(input: CreateCategoryInput) {
  const parentId = input.id_categories_parent ?? null;
  let level = 1;

  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id_category: parentId } });
    if (!parent) throw new AppError(404, 'PARENT_NOT_FOUND', 'Không tìm thấy loại mặt hàng cha');
    level = parent.level + 1;
    if (level > MAX_LEVEL) {
      throw new AppError(422, 'MAX_LEVEL_EXCEEDED', `Chỉ cho phép tối đa ${MAX_LEVEL} cấp`);
    }
  }
  await UniqueName(parentId, input.category_name);
  return prisma.category.create({
    data: {
      category_name: input.category_name,
      id_categories_parent: parentId,
      level,
      commission_rate: input.commission_rate ?? 0,
    },
  });
}

export async function update(id: number, input: UpdateCategoryInput) {
  const category = await findOrThrow(id);
  if (input.category_name) {
    await UniqueName(category.id_categories_parent, input.category_name, id);
  }
  return prisma.category.update({ where: { id_category: id }, data: input });
}

export async function remove(id: number) {
  await findOrThrow(id);
  const childCount = await prisma.category.count({ where: { id_categories_parent: id } });
  if (childCount > 0) {
    throw new AppError(422, 'CATEGORY_HAS_CHILDREN', 'Không thể xóa loại mặt hàng đang có loại con');
  }
  await prisma.category.delete({ where: { id_category: id } });
}

