-- Update sort_order to make #EF4444 (red) the first/default color
UPDATE available_colors 
SET sort_order = CASE 
  WHEN color_hex = '#EF4444' THEN 0
  WHEN color_hex = '#4F8EF7' THEN 1
  WHEN color_hex = '#10B981' THEN 2
  WHEN color_hex = '#F59E0B' THEN 3
  WHEN color_hex = '#8B5CF6' THEN 4
  WHEN color_hex = '#EC4899' THEN 5
  WHEN color_hex = '#06B6D4' THEN 6
  WHEN color_hex = '#84CC16' THEN 7
  WHEN color_hex = '#F97316' THEN 8
  ELSE sort_order
END
WHERE color_hex IN ('#EF4444', '#4F8EF7', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316');